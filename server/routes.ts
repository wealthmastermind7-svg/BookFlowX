import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { businesses, services, bookings, customers, trainingData, businessKnowledge, voiceCallLogs } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { 
  sendBookingConfirmation, 
} from "./email";
import { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
} from "./googleCalendar";
import { 
  loadBookingHtml, 
  getBookingHtml,
  loadEmbedHtml,
  loadEmbedJs,
  loadVoiceAgentHtml,
} from "./templates";

type AuthenticatedRequest = Request & {
  businessId?: string;
};

// Helper function to get clean origin for embed scripts
function getEmbedOrigin(req: Request): string {
  const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && !domain.includes('localhost')) {
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    return `https://${cleanDomain}`;
  }
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

// Helper function to generate booking URL
function getBookingUrlForBusiness(business: any, req: Request): string {
  const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && !domain.includes('localhost')) {
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    return `https://${cleanDomain}/book/${business.slug}`;
  } else {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol;
    return `${protocol}://${host}/book/${business.slug}`;
  }
}

// Helper function to extract text from HTML
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50000);
}

// Helper to extract internal links from HTML
function extractInternalLinks(html: string, baseUrl: string): string[] {
  try {
    const urlObj = new URL(baseUrl);
    const domain = urlObj.origin;
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      if (href.startsWith('/')) href = domain + href;
      else if (!href.startsWith('http')) href = domain + '/' + href;
      try {
        const linkUrl = new URL(href);
        if (linkUrl.origin === domain && !links.includes(linkUrl.href)) {
          links.push(linkUrl.href.split('#')[0].split('?')[0]);
        }
      } catch {}
    }
    return [...new Set(links)];
  } catch {
    return [];
  }
}

function registerTrainingRoutes(app: Express) {
  app.get("/api/agents/:agentId/training", async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const data = await storage.getTrainingDataByAgent(agentId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching agent training data:", error);
      res.status(500).json({ error: "Failed to fetch training data" });
    }
  });

  app.post("/api/agents/:agentId/training/qa", async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { question, answer, businessId } = req.body;
      if (!question || !answer) return res.status(400).json({ error: "Question and answer are required" });
      const data = await storage.createTrainingData({
        businessId,
        agentId,
        type: "qa_pair",
        question,
        answer,
        status: "active"
      });
      res.status(201).json(data);
    } catch (error) {
      console.error("Error adding Q&A pair:", error);
      res.status(500).json({ error: "Failed to add Q&A pair" });
    }
  });

  app.post("/api/agents/:agentId/training/crawl", async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { url, maxPages = 10, businessId } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const crawledUrls = new Set<string>();
      const urlsToCrawl = [url];
      const results: any[] = [];
      const pageLimit = Math.min(maxPages, 50);
      while (urlsToCrawl.length > 0 && crawledUrls.size < pageLimit) {
        const currentUrl = urlsToCrawl.shift()!;
        if (crawledUrls.has(currentUrl)) continue;
        crawledUrls.add(currentUrl);
        try {
          const response = await fetch(currentUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyBot/1.0)' },
          });
          if (!response.ok) continue;
          const html = await response.text();
          const textContent = extractTextFromHtml(html);
          if (textContent.length < 100) continue;
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : currentUrl;
          const data = await storage.createTrainingData({
            businessId,
            agentId,
            type: "website_crawl",
            title,
            content: textContent,
            sourceUrl: currentUrl,
            status: "active",
          });
          results.push({ ...data, contentLength: textContent.length });
          if (crawledUrls.size < pageLimit) {
            const newLinks = extractInternalLinks(html, currentUrl);
            for (const link of newLinks) {
              if (!crawledUrls.has(link) && !urlsToCrawl.includes(link)) {
                urlsToCrawl.push(link);
              }
            }
          }
        } catch (err) {
          console.log(`Failed to crawl ${currentUrl}:`, err);
        }
      }
      res.status(201).json({
        pagesCrawled: results.length,
        results,
        message: `Successfully crawled ${results.length} page(s) from ${url}`,
      });
    } catch (error) {
      console.error("Error crawling website:", error);
      res.status(500).json({ error: "Failed to crawl website" });
    }
  });

  app.delete("/api/training/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteTrainingData(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting training data:", error);
      res.status(500).json({ error: "Failed to delete training data" });
    }
  });
}

async function verifyBusinessOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { businessId } = req.params;
  const ownerToken = req.headers['x-owner-token'] as string;
  if (!ownerToken) return res.status(401).json({ error: "Ownership token required" });
  const business = await storage.getBusiness(businessId);
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (business.ownerToken !== ownerToken) return res.status(403).json({ error: "Unauthorized access to this business" });
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  await loadBookingHtml();
  await loadEmbedHtml();
  await loadEmbedJs();
  await loadVoiceAgentHtml();

  registerTrainingRoutes(app);

  app.post("/api/test-email", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    try {
      const success = await sendBookingConfirmation({
        customerName: "Test User",
        customerEmail: email,
        serviceName: "Test Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00 AM",
        price: 5000,
        confirmationNumber: "TEST-123",
        businessName: "BookFlow Test",
      });
      if (success) res.json({ message: "Test email sent successfully" });
      else res.status(500).json({ error: "Failed to send test email. Check server logs." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/businesses/:businessId/google-calendar/auth-url", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const ownerToken = req.headers['x-owner-token'] as string;
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ error: "Google Calendar integration not configured" });
      }
      const authUrl = getGoogleAuthUrl(businessId, ownerToken);
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate auth URL" });
    }
  });

  app.get("/api/google-calendar/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error: oauthError } = req.query;
      if (oauthError) return res.redirect("/?calendar_error=denied");
      if (!code || !state) return res.redirect("/?calendar_error=missing_params");
      const result = await handleGoogleCallback(code as string, state as string);
      if (result.success) res.redirect("/?calendar_connected=true");
      else res.redirect(`/?calendar_error=${result.error}`);
    } catch (error: any) {
      res.redirect("/?calendar_error=internal_error");
    }
  });

  app.get("/book/:slug", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) return res.status(404).send("Business not found");
      const preselectedServiceId = req.query.serviceId as string;
      res.setHeader("Content-Type", "text/html");
      const html = await getBookingHtml(business, preselectedServiceId);
      res.send(html);
    } catch (error) {
      res.status(500).send("Error loading booking page");
    }
  });

  app.get("/api/public/businesses/:slug/services", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) return res.status(404).json({ error: "Business not found" });
      const services = await storage.getServices(business.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/public/businesses/:slug/availability", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { date, serviceId } = req.query;
      if (!date || !serviceId) return res.status(400).json({ error: "Date and serviceId are required" });
      const business = await storage.getBusinessBySlug(slug);
      if (!business) return res.status(404).json({ error: "Business not found" });
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      const bookings = await storage.getBookingsInRange(business.id, startOfDay, endOfDay);
      const slots = [];
      for (let hour = 9; hour < 17; hour++) {
        const time = `${hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
        const isBooked = bookings.some(b => b.time === time && b.status !== 'cancelled');
        if (!isBooked) slots.push(time);
      }
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.post("/api/public/businesses/:slug/book", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { serviceId, customerName, customerEmail, customerPhone, date, time, totalAmount } = req.body;
      const business = await storage.getBusinessBySlug(slug);
      if (!business) return res.status(404).json({ error: "Business not found" });
      const service = await storage.getService(serviceId);
      if (!service) return res.status(404).json({ error: "Service not found" });
      const booking = await storage.createBooking({
        businessId: business.id,
        serviceId,
        customerName,
        customerEmail,
        customerPhone,
        date: new Date(date),
        time,
        totalAmount,
        status: "confirmed"
      });
      try {
        await sendBookingConfirmation({
          customerName,
          customerEmail,
          serviceName: service.name,
          date,
          time,
          price: totalAmount,
          confirmationNumber: booking.id.substring(0, 8).toUpperCase(),
          businessName: business.name
        });
      } catch (emailError) {}
      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/businesses/:businessId", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business details" });
    }
  });

  app.patch("/api/businesses/:businessId", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.updateBusiness(req.params.businessId, req.body);
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to update business details" });
    }
  });

  app.get("/api/businesses/:businessId/insights", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const bookings = await storage.getBookings(businessId);
      const services = await storage.getServices(businessId);
      const revenue = bookings.reduce((sum, b) => sum + (b.status === 'confirmed' ? b.totalAmount : 0), 0);
      res.json({
        totalRevenue: revenue,
        totalBookings: bookings.length,
        activeBookings: bookings.filter(b => b.status === 'confirmed').length,
        activeServices: services.length,
        recentBookings: bookings.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.get("/api/businesses/:businessId/services", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const services = await storage.getServices(req.params.businessId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/businesses/:businessId/services", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await storage.createService({ ...req.body, businessId: req.params.businessId });
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.delete("/api/businesses/:businessId/services/:serviceId", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteService(req.params.serviceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/businesses/:businessId/bookings", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookings = await storage.getBookings(req.params.businessId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/businesses/:businessId/customers", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customers = await storage.getCustomers(req.params.businessId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/businesses/:businessId/stats/qr", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.incrementQrCount(req.params.businessId);
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to update QR stats" });
    }
  });

  app.post("/api/businesses/:businessId/stats/share", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.incrementShareCount(req.params.businessId);
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to update share stats" });
    }
  });

  app.get("/api/businesses/:businessId/knowledge", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const knowledge = await storage.getBusinessKnowledge(req.params.businessId);
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  app.post("/api/businesses/:businessId/knowledge", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const knowledge = await storage.createOrUpdateBusinessKnowledge({ ...req.body, businessId: req.params.businessId });
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });

  app.post("/api/businesses/:businessId/knowledge/scrape", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { websiteUrl, maxPages = 5 } = req.body;
      if (!websiteUrl) return res.status(400).json({ error: "Website URL is required" });
      const business = await storage.getBusiness(businessId);
      if (!business) return res.status(404).json({ error: "Business not found" });
      const { scrapeWebsiteContent, extractInternalLinks, extractBusinessInfo } = await import("./websiteScraper");
      const crawledUrls = new Set<string>();
      const urlsToCrawl = [websiteUrl];
      const pageLimit = Math.min(maxPages, 15);
      let combinedContent = "";
      while (urlsToCrawl.length > 0 && crawledUrls.size < pageLimit) {
        const currentUrl = urlsToCrawl.shift()!;
        if (crawledUrls.has(currentUrl)) continue;
        crawledUrls.add(currentUrl);
        try {
          const html = await scrapeWebsiteContent(currentUrl);
          const textContent = extractTextFromHtml(html);
          if (textContent.length > 100) combinedContent += "\n\n" + textContent;
          if (crawledUrls.size < pageLimit) {
            const newLinks = extractInternalLinks(html, websiteUrl);
            for (const link of newLinks) {
              if (!crawledUrls.has(link) && !urlsToCrawl.includes(link)) urlsToCrawl.push(link);
            }
          }
        } catch (err) {}
      }
      let knowledge = null;
      if (combinedContent.length > 100) {
        try {
          const extractedInfo = await extractBusinessInfo(combinedContent.substring(0, 30000), business.name);
          knowledge = await storage.createOrUpdateBusinessKnowledge({ businessId, websiteUrl, ...extractedInfo });
        } catch (extractError) {}
      }
      res.status(201).json({ knowledge, scraped: crawledUrls.size > 0, pagesCrawled: crawledUrls.size, message: `Successfully learned from ${crawledUrls.size} page(s)` });
    } catch (error: any) {
      res.status(201).json({ knowledge: null, scraped: false, pagesCrawled: 0, message: "Website could not be auto-trained." });
    }
  });

  app.get("/api/businesses/:businessId/training", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await storage.getTrainingData(req.params.businessId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training data" });
    }
  });

  app.get("/api/widget/fab.js", async (req: Request, res: Response) => {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).send("// Error: slug parameter required");
    const business = await storage.getBusinessBySlug(slug);
    if (!business) return res.status(404).send("// Error: Business not found");
    const theme = await storage.getBusinessTheme(business.id);
    const origin = getEmbedOrigin(req);
    const fabScript = `(function() {
  var config = {
    slug: "${slug}",
    primaryColor: "${theme?.primaryColor || "#000000"}",
    accentColor: "${theme?.accentColor || "#C5A059"}",
    borderRadius: ${theme?.borderRadius || 12},
    buttonStyle: "${theme?.buttonStyle || "rounded"}",
    origin: "${origin}"
  };
  function createFAB() {
    var fab = document.createElement("div");
    fab.id = "bookflow-fab";
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    var borderRadius = config.buttonStyle === "pill" ? "50%" : config.buttonStyle === "square" ? "8px" : "16px";
    fab.style.cssText = "position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:" + config.accentColor + ";border-radius:" + borderRadius + ";display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;transition:transform 0.3s ease,box-shadow 0.3s ease;color:#fff;";
    fab.onmouseenter = function() { fab.style.transform = "scale(1.1)"; fab.style.boxShadow = "0 6px 30px rgba(0,0,0,0.4)"; };
    fab.onmouseleave = function() { fab.style.transform = "scale(1)"; fab.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; };
    fab.onclick = function() { openBookingModal(); };
    document.body.appendChild(fab);
  }
  function openBookingModal() {
    var overlay = document.createElement("div");
    overlay.id = "bookflow-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
    var modal = document.createElement("div");
    modal.style.cssText = "width:90%;max-width:480px;height:80%;max-height:700px;background:#fff;border-radius:" + config.borderRadius + "px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);transform:scale(0.9);transition:transform 0.3s ease;";
    var iframe = document.createElement("iframe");
    iframe.src = config.origin + "/book/" + config.slug;
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.style.opacity = "1"; modal.style.transform = "scale(1)"; }, 10);
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.style.opacity = "0"; modal.style.transform = "scale(0.9)"; setTimeout(function() { overlay.remove(); }, 300); } };
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", createFAB); } else { createFAB(); }
})();`;
    res.setHeader("Content-Type", "application/javascript");
    res.send(fabScript);
  });

  const httpServer = createServer(app);
  return httpServer;
}
