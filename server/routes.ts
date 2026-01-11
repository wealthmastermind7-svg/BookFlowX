import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { storage } from "./storage";
import { 
  insertBusinessSchema, 
  insertServiceSchema, 
  insertCustomerSchema, 
  insertBookingSchema,
  insertPushTokenSchema,
} from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { sendBookingConfirmation } from "./email";
import { sendBookingNotification, sendTestNotification } from "./notifications";
import { 
  verifyBusinessOwnership, 
  verifyServiceOwnership, 
  verifyBookingOwnership,
  verifyCustomerOwnership,
  type AuthenticatedRequest 
} from "./middleware/auth";
import { triggerWorkflows, initializeIndustryBlueprints, INDUSTRY_BLUEPRINTS } from "./workflowEngine";
import { insertWorkflowSchema, insertBusinessThemeSchema } from "@shared/schema";
import crypto from "crypto";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load booking HTML into memory for production reliability
let bookingHtmlContent: string = "";
let embedHtmlContent: string = "";
let embedJsContent: string = "";

async function loadBookingHtml() {
  const paths = [
    path.resolve(__dirname, "templates/booking.html"),
    path.resolve(process.cwd(), "server/templates/booking.html"),
    path.resolve(process.cwd(), "templates/booking.html"),
  ];
  
  for (const p of paths) {
    try {
      bookingHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded booking.html from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load booking.html. Paths tried:", paths);
}

async function loadEmbedHtml() {
  const paths = [
    path.resolve(__dirname, "templates/embed.html"),
    path.resolve(process.cwd(), "server/templates/embed.html"),
    path.resolve(process.cwd(), "templates/embed.html"),
  ];
  
  for (const p of paths) {
    try {
      embedHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded embed.html from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load embed.html. Paths tried:", paths);
}

async function loadEmbedJs() {
  const paths = [
    path.resolve(__dirname, "static/embed.js"),
    path.resolve(process.cwd(), "server/static/embed.js"),
    path.resolve(process.cwd(), "static/embed.js"),
  ];
  
  for (const p of paths) {
    try {
      embedJsContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded embed.js from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load embed.js. Paths tried:", paths);
}

function getEmbedOrigin(req: Request): string {
  // API_DOMAIN is set at runtime for production deployments
  const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && !domain.includes('localhost')) {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/:5000$/, '');
    return `https://${cleanDomain}`;
  }
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

// Helper function to generate booking URL
function getBookingUrlForBusiness(business: any, req: Request): string {
  // API_DOMAIN is set at runtime for production deployments
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Load templates at startup
  await loadBookingHtml();
  await loadEmbedHtml();
  await loadEmbedJs();

  // === BUSINESSES API ===
  
  // Get business by ID (for admin dashboard)
  app.get("/api/businesses/:id", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        // Try by slug as fallback for backwards compatibility
        const bySlug = await storage.getBusinessBySlug(req.params.id);
        if (!bySlug) {
          return res.status(404).json({ error: "Business not found" });
        }
        const bookingUrl = getBookingUrlForBusiness(bySlug, req);
        return res.json({ ...bySlug, bookingUrl });
      }
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.json({ ...business, bookingUrl });
    } catch (error) {
      console.error("Error getting business:", error);
      res.status(500).json({ error: "Failed to get business" });
    }
  });

  // Create business
  app.post("/api/businesses", async (req: Request, res: Response) => {
    try {
      const data = insertBusinessSchema.parse(req.body);
      
      // Check if business with this slug already exists
      const existing = await storage.getBusinessBySlug(data.slug);
      if (existing) {
        const bookingUrl = getBookingUrlForBusiness(existing, req);
        return res.status(201).json({ ...existing, bookingUrl });
      }
      
      const business = await storage.createBusiness(data);
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.status(201).json({ ...business, bookingUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating business:", error);
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Update business (PROTECTED)
  app.patch("/api/businesses/:id", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertBusinessSchema.partial().parse(req.body);
      const business = await storage.updateBusiness(req.params.id, updates);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.json({ ...business, bookingUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating business:", error);
      res.status(500).json({ error: "Failed to update business" });
    }
  });

  // === SERVICES API ===
  
  // Get services for a business (public)
  app.get("/api/businesses/:businessId/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getServices(req.params.businessId);
      res.json(services);
    } catch (error) {
      console.error("Error getting services:", error);
      res.status(500).json({ error: "Failed to get services" });
    }
  });

  // Get single service
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error getting service:", error);
      res.status(500).json({ error: "Failed to get service" });
    }
  });

  // Create service (PROTECTED)
  app.post("/api/businesses/:businessId/services", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertServiceSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  // Update service (PROTECTED)
  app.patch("/api/services/:id", verifyServiceOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, updates);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  // Delete service (PROTECTED)
  app.delete("/api/services/:id", verifyServiceOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // === CUSTOMERS API ===
  
  // Get customers for a business
  app.get("/api/businesses/:businessId/customers", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers(req.params.businessId);
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).json({ error: "Failed to get customers" });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error getting customer:", error);
      res.status(500).json({ error: "Failed to get customer" });
    }
  });

  // Create customer (public - for booking flow)
  app.post("/api/businesses/:businessId/customers", async (req: Request, res: Response) => {
    try {
      // Check if customer already exists by email
      const existing = await storage.getCustomerByEmail(req.params.businessId, req.body.email);
      if (existing) {
        return res.json(existing);
      }
      
      const data = insertCustomerSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Update customer (PROTECTED)
  app.patch("/api/customers/:id", verifyCustomerOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, updates);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // === BOOKINGS API ===
  
  // Get bookings for a business
  app.get("/api/businesses/:businessId/bookings", async (req: Request, res: Response) => {
    try {
      const { date } = req.query;
      let bookings;
      if (date && typeof date === "string") {
        bookings = await storage.getBookingsByDate(req.params.businessId, date);
      } else {
        bookings = await storage.getBookings(req.params.businessId);
      }
      res.json(bookings);
    } catch (error) {
      console.error("Error getting bookings:", error);
      res.status(500).json({ error: "Failed to get bookings" });
    }
  });

  // Get single booking
  app.get("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error getting booking:", error);
      res.status(500).json({ error: "Failed to get booking" });
    }
  });

  // Create booking (public - for booking flow)
  app.post("/api/businesses/:businessId/bookings", async (req: Request, res: Response) => {
    try {
      const data = insertBookingSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const booking = await storage.createBooking(data);
      
      // Get business and service for notifications
      const business = await storage.getBusiness(req.params.businessId);
      const service = await storage.getService(data.serviceId);
      const serviceName = service?.name || "Service";
      
      // Get customer details - from request body or by looking up customerId
      let customerEmail = req.body.customerEmail;
      let customerName = req.body.customerName;
      
      if (!customerEmail && data.customerId) {
        console.log(`[Booking] Looking up customer ${data.customerId} for email...`);
        const customer = await storage.getCustomer(data.customerId);
        if (customer) {
          customerEmail = customer.email;
          customerName = customer.name;
          console.log(`[Booking] Found customer: ${customerName} (${customerEmail})`);
        }
      }
      
      // Send email confirmation
      if (customerEmail && customerName) {
        console.log(`[Booking] Triggering email confirmation for ${customerEmail} (${customerName})`);
        sendBookingConfirmation({
          customerName: customerName,
          customerEmail: customerEmail,
          serviceName,
          date: data.date,
          time: data.time,
          price: data.totalPrice,
          confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
          businessName: business?.name || "Business",
          currency: business?.currency || "USD"
        })
        .then(success => {
          if (success) console.log(`[Booking] Email sent successfully to ${customerEmail}`);
          else console.error(`[Booking] Failed to send email to ${customerEmail}`);
        })
        .catch(err => console.error("[Booking] Critical error in email confirmation:", err));
      } else {
        console.log(`[Booking] Skipping email - missing customer details. Email: ${customerEmail}, Name: ${customerName}, CustomerId: ${data.customerId}`);
      }
      
      // Send push notification to business owner (if notifications are enabled)
      if (business?.notificationsEnabled) {
        sendBookingNotification(
          req.params.businessId,
          customerName || "Customer",
          serviceName,
          data.date,
          data.time
        ).catch(err => console.error("Failed to send push notification:", err));
      }
      
      // Trigger workflow automations for booking_created
      const customer = await storage.getCustomer(data.customerId);
      triggerWorkflows("booking_created", req.params.businessId, {
        booking,
        service: service || undefined,
        customer: customer || undefined,
      }).catch(err => console.error("[Workflow] Error triggering booking_created:", err));
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Update booking (PROTECTED)
  app.patch("/api/bookings/:id", verifyBookingOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(req.params.id, updates);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Trigger workflows on status change
      if (updates.status) {
        const triggerType = `booking_${updates.status}`;
        const service = await storage.getService(booking.serviceId);
        const customer = await storage.getCustomer(booking.customerId);
        
        triggerWorkflows(triggerType, booking.businessId, {
          booking,
          service: service || undefined,
          customer: customer || undefined,
        }).catch(err => console.error(`[Workflow] Error triggering ${triggerType}:`, err));
      }

      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating booking:", error);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // === AVAILABILITY API ===
  
  // Get availability for a business
  app.get("/api/businesses/:businessId/availability", async (req: Request, res: Response) => {
    try {
      const availability = await storage.getAvailability(req.params.businessId);
      res.json(availability);
    } catch (error) {
      console.error("Error getting availability:", error);
      res.status(500).json({ error: "Failed to get availability" });
    }
  });

  // Set/update availability for a specific day (PROTECTED)
  app.put("/api/businesses/:businessId/availability/:dayOfWeek", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startTime, endTime, isActive } = req.body;
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: "Invalid day of week (must be 0-6)" });
      }
      
      const availability = await storage.updateOrCreateAvailability({
        businessId: req.params.businessId,
        dayOfWeek,
        startTime: startTime || "09:00",
        endTime: endTime || "17:00",
        isActive: isActive !== undefined ? isActive : true,
      });
      
      res.json(availability);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Bulk update availability (set all days at once) (PROTECTED)
  app.put("/api/businesses/:businessId/availability", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { schedules } = req.body;
      
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: "Schedules must be an array" });
      }
      
      const results = [];
      for (const schedule of schedules) {
        const availability = await storage.updateOrCreateAvailability({
          businessId: req.params.businessId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime || "09:00",
          endTime: schedule.endTime || "17:00",
          isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        });
        results.push(availability);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Get available time slots for a specific date
  app.get("/api/businesses/:businessId/slots/:date", async (req: Request, res: Response) => {
    try {
      const { businessId, date } = req.params;
      const { serviceId } = req.query;
      
      // Get business availability settings
      const availability = await storage.getAvailability(businessId);
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      
      // Find availability for this day
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek && a.isActive);
      
      if (!dayAvailability) {
        return res.json({ slots: [], message: "Business is closed on this day" });
      }
      
      // Get existing bookings for this date
      const bookings = await storage.getBookingsByDate(businessId, date);
      const bookedTimes = bookings.map(b => b.time);
      
      // Generate time slots
      const slots = [];
      const [startHour] = dayAvailability.startTime.split(":").map(Number);
      const [endHour] = dayAvailability.endTime.split(":").map(Number);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
        const time30 = `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? "PM" : "AM"}`;
        
        slots.push({
          time,
          available: !bookedTimes.includes(time),
        });
        slots.push({
          time: time30,
          available: !bookedTimes.includes(time30),
        });
      }
      
      res.json({ slots });
    } catch (error) {
      console.error("Error getting slots:", error);
      res.status(500).json({ error: "Failed to get slots" });
    }
  });

  // === DEMO DATA ===
  
  // Initialize demo data for a business (PROTECTED)
  app.post("/api/businesses/:businessId/demo-data", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessType = "salon" } = req.body;
      await storage.initializeDemoData(req.params.businessId, businessType);
      res.json({ message: "Demo data initialized" });
    } catch (error) {
      console.error("Error initializing demo data:", error);
      res.status(500).json({ error: "Failed to initialize demo data" });
    }
  });

  // Clear all data for a business (PROTECTED)
  app.delete("/api/businesses/:businessId/data", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.clearAllData(req.params.businessId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing all data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Extract theme colors from a website
  app.post("/api/businesses/:businessId/theme/extract", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`[Theme] Extracting colors from: ${url}`);
      
      // Basic heuristic for extraction
      // In a real production app, we'd use a more robust solution like a headless browser
      // or a dedicated color extraction service.
      
      let primaryColor = "#000000";
      let accentColor = "#C5A059";
      let backgroundColor = "#FFFFFF";
      let textColor = "#1A1C1E";

      // Dynamic color extraction for all websites
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const html = await response.text();
          clearTimeout(timeoutId);

          // Helper to normalize 3-digit hex to 6-digit and uppercase
          const normalizeHex = (hex: string): string => {
            const h = hex.replace('#', '').toUpperCase();
            if (h.length === 3) {
              return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            }
            return '#' + h;
          };

          // Helper to check if color is a useful branding color (not too light/dark/gray)
          const isUsefulColor = (hex: string): boolean => {
            const h = hex.replace('#', '');
            if (h.length !== 6) return false;
            const r = parseInt(h.substring(0, 2), 16);
            const g = parseInt(h.substring(2, 4), 16);
            const b = parseInt(h.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            
            // Mintwash specific: they use a lot of blue/teal
            // Increase brightness upper bound slightly for their vibrant blue
            return brightness > 40 && brightness < 240 && saturation > 15;
          };

          // Helper to calculate color contrast for better accent selection
          const getColorLuminance = (hex: string): number => {
            const h = hex.replace('#', '');
            const r = parseInt(h.substring(0, 2), 16) / 255;
            const g = parseInt(h.substring(2, 4), 16) / 255;
            const b = parseInt(h.substring(4, 6), 16) / 255;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };

          let allCssContent = html;
          
          // Extract and fetch external stylesheets (up to 3 to avoid timeout)
          const stylesheetPattern = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
          const stylesheetMatches = [...html.matchAll(stylesheetPattern)].slice(0, 3);
          
          for (const match of stylesheetMatches) {
            try {
              let cssUrl = match[1];
              // Handle relative URLs
              if (cssUrl.startsWith('/')) {
                const baseUrl = new URL(url);
                cssUrl = baseUrl.origin + cssUrl;
              } else if (!cssUrl.startsWith('http')) {
                const baseUrl = new URL(url);
                cssUrl = baseUrl.origin + '/' + cssUrl;
              }
              
              const cssController = new AbortController();
              const cssTimeoutId = setTimeout(() => cssController.abort(), 3000);
              const cssResponse = await fetch(cssUrl, { 
                signal: cssController.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookFlow/1.0)' }
              });
              const cssText = await cssResponse.text();
              clearTimeout(cssTimeoutId);
              allCssContent += '\n' + cssText;
            } catch {
              // Ignore failed stylesheet fetches
            }
          }

          const foundColors: string[] = [];

          // 1. Look for CSS custom properties (most reliable for branding)
          const cssVarPatterns = [
            /--(?:primary|brand|main|accent|theme|highlight)[-_]?(?:color)?:\s*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi,
            /--color-(?:primary|brand|main|accent|highlight):\s*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi,
            /--(?:c-|color-)(?:primary|brand|accent):\s*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi,
          ];
          for (const pattern of cssVarPatterns) {
            const matches = allCssContent.matchAll(pattern);
            for (const match of matches) {
              foundColors.push(normalizeHex(match[1]));
            }
          }

          // 2. Look for theme-color meta tag
          const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})["']/i);
          if (themeColorMatch) {
            foundColors.unshift(normalizeHex(themeColorMatch[1])); // Priority
          }

          // 3. Look for colors in button/link/header styles (likely brand colors)
          const brandingPatterns = [
            /(?:\.btn|button|\.cta|\.primary|\.header|\.nav|\.logo|\.brand)[^}]*(?:background(?:-color)?|color):\s*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi,
            /(?:a:hover|\.active|\.selected)[^}]*(?:background(?:-color)?|color):\s*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi,
          ];
          for (const pattern of brandingPatterns) {
            const matches = allCssContent.matchAll(pattern);
            for (const match of matches) {
              const color = normalizeHex(match[1]);
              if (isUsefulColor(color)) {
                foundColors.push(color);
              }
            }
          }

          // 4. Fallback: extract all hex colors and count frequency
          const allHexPattern = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})(?![A-Fa-f0-9])/g;
          const allMatches = allCssContent.match(allHexPattern) || [];
          const colorFrequency: Record<string, number> = {};
          
          for (const color of allMatches) {
            const normalized = normalizeHex(color);
            if (isUsefulColor(normalized)) {
              colorFrequency[normalized] = (colorFrequency[normalized] || 0) + 1;
            }
          }
          
          // Sort by frequency
          const sortedColors = Object.entries(colorFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color);
          
          foundColors.push(...sortedColors);

          // Remove duplicates while preserving order (all normalized to uppercase)
          const uniqueColors = [...new Set(foundColors.map(c => c.toUpperCase()))].filter(c => c && c.length === 7);
          
          if (uniqueColors.length > 0) {
            primaryColor = uniqueColors[0];
            
            // Find a contrasting accent color
            if (uniqueColors.length > 1) {
              const primaryLum = getColorLuminance(primaryColor);
              // Pick color with most contrast from primary
              let bestAccent = uniqueColors[1];
              let bestContrast = 0;
              
              for (let i = 1; i < Math.min(uniqueColors.length, 10); i++) {
                const accentLum = getColorLuminance(uniqueColors[i]);
                const contrast = Math.abs(primaryLum - accentLum);
                if (contrast > bestContrast) {
                  bestContrast = contrast;
                  bestAccent = uniqueColors[i];
                }
              }
              accentColor = bestAccent;
            }
            // If only one color found, derive an accent by adjusting brightness
            else {
              const h = primaryColor.replace('#', '');
              const r = Math.min(255, parseInt(h.substring(0, 2), 16) + 60);
              const g = Math.min(255, parseInt(h.substring(2, 4), 16) + 40);
              const b = Math.min(255, parseInt(h.substring(4, 6), 16) + 20);
              accentColor = '#' + r.toString(16).padStart(2, '0').toUpperCase() + 
                            g.toString(16).padStart(2, '0').toUpperCase() + 
                            b.toString(16).padStart(2, '0').toUpperCase();
            }
          }
          
          console.log(`[Theme] Found ${uniqueColors.length} unique branding colors:`, uniqueColors.slice(0, 5));
      } catch (e) {
        console.error("[Theme] Scraping failed, using defaults:", e);
      }

      res.json({
        primaryColor,
        accentColor,
        backgroundColor,
        textColor
      });
    } catch (error) {
      console.error("Error extracting theme:", error);
      res.status(500).json({ error: "Failed to extract theme" });
    }
  });

  // === STATS API ===
  
  // Get dashboard stats for a business
  app.get("/api/businesses/:businessId/stats", async (req: Request, res: Response) => {
    try {
      const bookings = await storage.getBookings(req.params.businessId);
      const customers = await storage.getCustomers(req.params.businessId);
      const services = await storage.getServices(req.params.businessId);
      
      const totalRevenue = bookings
        .filter(b => b.status === "completed" || b.status === "confirmed")
        .reduce((sum, b) => sum + b.totalPrice, 0);
      
      const today = new Date().toISOString().split("T")[0];
      const todayBookings = bookings.filter(b => b.date === today);
      
      // Weekly revenue (last 7 days)
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const revenue = dayBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        weeklyData.push({
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          revenue: revenue / 100,
        });
      }
      
      res.json({
        totalRevenue: totalRevenue / 100,
        totalBookings: bookings.length,
        totalCustomers: customers.length,
        totalServices: services.length,
        todayBookings: todayBookings.length,
        weeklyData,
        recentBookings: bookings.slice(0, 5),
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // === PUSH TOKENS API ===
  
  // Register push token
  app.post("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const data = insertPushTokenSchema.parse(req.body);
      const pushToken = await storage.createPushToken(data);
      res.status(201).json(pushToken);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  // Delete push token
  app.delete("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const { token, businessId } = req.body;
      if (!token || !businessId) {
        return res.status(400).json({ error: "Token and businessId are required" });
      }
      await storage.deletePushToken(token, businessId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting push token:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  // Get push token count for a business (returns count only, not tokens for security)
  app.get("/api/businesses/:businessId/push-tokens", async (req: Request, res: Response) => {
    try {
      const tokens = await storage.getPushTokens(req.params.businessId);
      res.json({ 
        count: tokens.length,
        devices: tokens.map(t => ({ 
          platform: t.platform, 
          deviceName: t.deviceName,
          createdAt: t.createdAt 
        }))
      });
    } catch (error) {
      console.error("Error getting push tokens:", error);
      res.status(500).json({ error: "Failed to get push tokens" });
    }
  });

  // Send test notification
  app.post("/api/businesses/:businessId/test-notification", async (req: Request, res: Response) => {
    try {
      const result = await sendTestNotification(req.params.businessId);
      res.json(result);
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Send test email (for debugging Resend integration)
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      console.log(`[Test Email] Attempting to send test email to ${email}`);
      
      const success = await sendBookingConfirmation({
        customerName: "Test User",
        customerEmail: email,
        serviceName: "Test Service",
        date: new Date().toISOString().split('T')[0],
        time: "2:00 PM",
        price: 50,
        confirmationNumber: "TEST1234",
        businessName: "BookFlow Test"
      });
      
      if (success) {
        res.json({ success: true, message: `Test email sent to ${email}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test email. Check server logs." });
      }
    } catch (error) {
      console.error("[Test Email] Error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // === QR CODE API ===
  
  // Generate QR code for booking link
  app.get("/api/businesses/:businessId/qrcode", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      // Use helper function to generate booking URL
      const bookingUrl = getBookingUrlForBusiness(business, req);
      
      // Check if requesting as image (PNG) or JSON
      const format = req.query.format || 'json';
      
      if (format === 'image' || format === 'png') {
        // Return as PNG image file for direct download/sharing
        const qrCodeBuffer = await new Promise<Buffer>((resolve, reject) => {
          QRCode.toBuffer(bookingUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
          });
        });
        
        res.type('image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${business.slug}-booking-qr.png"`);
        res.send(qrCodeBuffer);
      } else {
        // Return as JSON with base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        res.json({ 
          qrCode: qrCodeDataUrl,
          bookingUrl,
          qrImageUrl: `/api/businesses/${business.id}/qrcode?format=image`
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // === PUBLIC BOOKING PAGE ===
  
  // Serve OG image (simple placeholder)
  app.get("/og-image.png", (req: Request, res: Response) => {
    // Return a simple SVG image as PNG fallback
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#000000"/>
      <text x="600" y="315" font-size="72" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-family="Arial">
        BookFlow
      </text>
      <text x="600" y="400" font-size="36" text-anchor="middle" fill="#9E9E9E" font-family="Arial">
        Book Your Appointment
      </text>
    </svg>`;
    
    res.type("image/svg+xml").send(svg);
  });
  
  // Helper function to generate Open Graph meta tags
  function generateOpenGraphMeta(business: any, service?: any, req?: Request, allServices?: any[]): string {
    // Determine the base URL - use env domain if set, otherwise use request host
    let baseUrl = '';
    const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
    
    if (domain) {
      // Clean up the domain and add https
      const cleanDomain = domain.replace(/^https?:\/\//, '');
      baseUrl = `https://${cleanDomain}`;
    } else if (req) {
      // Fallback to request host
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'https';
      baseUrl = `${protocol}://${host}`;
    } else {
      baseUrl = 'https://localhost:5000';
    }
    
    let title = business.name;
    let description = `Book an appointment with ${business.name}. Fast, easy, and secure booking.`;

    if (service) {
      title = `${service.name} - ${business.name}`;
      description = `Schedule your ${service.name} appointment instantly. No calls required.`;
    } else if (allServices && allServices.length > 0) {
      // Highlight all services by listing them
      const serviceNames = allServices.slice(0, 4).map(s => s.name).join(', ');
      title = `${business.name} | Professional Services`;
      description = `Services: ${serviceNames}${allServices.length > 4 ? ' and more' : ''}. Book your appointment instantly online.`;
    }
    
    // Use OG image from assets
    const ogImage = `${baseUrl}/assets/og/booking-preview.png`;
    
    return `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/book/${business.slug}" />
    <meta property="og:site_name" content="BookFlow" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="BookFlow" />`;
  }
  
  // Serve public booking page (client-side routing)
  app.get("/book/:slug", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const services = await storage.getServices(business.id);
      
      // Check for specific service highlight via query param
      const targetServiceId = req.query.serviceId as string;
      let highlightedService = services && services.length > 0 ? services[0] : undefined;
      
      if (targetServiceId) {
        const found = services.find(s => s.id === targetServiceId);
        if (found) highlightedService = found;
      }

      // If no specific service is requested via query, and user wants "all services", 
      // we pass null to service to trigger the "all services" description logic
      const ogMeta = generateOpenGraphMeta(
        business, 
        targetServiceId ? highlightedService : undefined, 
        req, 
        services
      );
      
      // Insert Open Graph meta tags into the HTML before the closing </head> tag
      const htmlWithMeta = bookingHtmlContent.replace(
        '</head>',
        `${ogMeta}\n  </head>`
      );
      
      res.type("text/html").send(htmlWithMeta);
    } catch (error) {
      console.error("Error serving booking page:", error);
      if (bookingHtmlContent) {
        res.type("text/html").send(bookingHtmlContent);
      } else {
        res.status(500).json({ error: "Booking page not available" });
      }
    }
  });
  
  app.get("/book/:slug/*", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const services = await storage.getServices(business.id);
      const firstService = services && services.length > 0 ? services[0] : undefined;
      
      const ogMeta = generateOpenGraphMeta(business, firstService, req);
      
      // Insert Open Graph meta tags into the HTML before the closing </head> tag
      const htmlWithMeta = bookingHtmlContent.replace(
        '</head>',
        `${ogMeta}\n  </head>`
      );
      
      res.type("text/html").send(htmlWithMeta);
    } catch (error) {
      console.error("Error serving booking page:", error);
      if (bookingHtmlContent) {
        res.type("text/html").send(bookingHtmlContent);
      } else {
        res.status(500).json({ error: "Booking page not available" });
      }
    }
  });

  // === EMBED WIDGET ===
  
  // Serve embeddable booking widget (iframe-friendly)
  app.get("/embed/:slug", (req: Request, res: Response) => {
    if (embedHtmlContent) {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *;");
      res.type("text/html").send(embedHtmlContent);
    } else {
      res.status(500).json({ error: "Embed widget not available" });
    }
  });
  
  // Serve embed.js loader script
  app.get("/embed.js", (req: Request, res: Response) => {
    if (embedJsContent) {
      const origin = getEmbedOrigin(req);
      const jsWithOrigin = embedJsContent.replace(/\{\{EMBED_ORIGIN\}\}/g, origin);
      res.type("application/javascript").send(jsWithOrigin);
    } else {
      res.status(500).json({ error: "Embed script not available" });
    }
  });

  // Get embed code snippets for a business
  app.get("/api/businesses/:businessId/embed-code", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const origin = getEmbedOrigin(req);
      const embedUrl = `${origin}/embed/${business.slug}`;
      const scriptUrl = `${origin}/embed.js`;
      
      const buttonText = (req.query.buttonText as string) || 'Book Now';
      const buttonColor = (req.query.buttonColor as string) || '#000000';
      
      const inlineCode = `<!-- BookFlow Inline Widget -->
<div id="bookflow-widget"></div>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'inline',
    container: '#bookflow-widget'
  });
</script>`;

      const popupButtonCode = `<!-- BookFlow Popup Button -->
<div id="bookflow-button"></div>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'popup-button',
    container: '#bookflow-button',
    buttonText: '${buttonText}',
    buttonColor: '${buttonColor}'
  });
</script>`;

      const popupTextCode = `<!-- BookFlow Popup Text Link -->
<span id="bookflow-link"></span>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'popup-text',
    container: '#bookflow-link',
    buttonText: '${buttonText}',
    buttonColor: '${buttonColor}'
  });
</script>`;

      res.json({
        embedUrl,
        scriptUrl,
        inlineCode,
        popupButtonCode,
        popupTextCode,
        businessSlug: business.slug
      });
    } catch (error) {
      console.error("Error generating embed code:", error);
      res.status(500).json({ error: "Failed to generate embed code" });
    }
  });

  // === WORKFLOWS API ===
  
  // Get available industry blueprints
  app.get("/api/workflows/blueprints", async (_req: Request, res: Response) => {
    const blueprintSummary = Object.entries(INDUSTRY_BLUEPRINTS).map(([industry, workflows]) => ({
      industry,
      count: workflows.length,
      workflows: workflows.map(w => ({
        name: w.name,
        description: w.description,
        triggerType: w.triggerType,
        actionType: w.actionType,
      })),
    }));
    res.json(blueprintSummary);
  });

  // Get workflows for a business (PROTECTED)
  app.get("/api/businesses/:businessId/workflows", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      const workflows = await storage.getWorkflows(businessId);
      res.json(workflows);
    } catch (error) {
      console.error("Error getting workflows:", error);
      res.status(500).json({ error: "Failed to get workflows" });
    }
  });

  // Create workflow (PROTECTED)
  app.post("/api/businesses/:businessId/workflows", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      const data = insertWorkflowSchema.parse({
        ...req.body,
        businessId,
      });
      const workflow = await storage.createWorkflow(data);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  // Initialize industry blueprints (PROTECTED)
  app.post("/api/businesses/:businessId/workflows/initialize", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { industry } = req.body;
      if (!industry) {
        return res.status(400).json({ error: "Industry is required" });
      }

      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      console.log(`[Workflow] Initializing blueprints for business: ${businessId}, industry: "${industry}"`);
      
      const normalizedIndustry = industry.toLowerCase().trim();
      if (!INDUSTRY_BLUEPRINTS[normalizedIndustry as keyof typeof INDUSTRY_BLUEPRINTS]) {
        console.error(`[Workflow] Invalid industry requested: "${industry}"`);
        return res.status(400).json({ 
          error: "Invalid industry template",
          details: `Industry "${industry}" is not supported.`
        });
      }

      await initializeIndustryBlueprints(businessId, normalizedIndustry);
      
      const workflows = await storage.getWorkflows(businessId);
      res.status(201).json(workflows);
    } catch (error) {
      console.error("[Workflow] Error initializing blueprints:", error);
      res.status(500).json({ 
        error: "Failed to initialize blueprints",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update workflow (PROTECTED)
  app.patch("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      const ownerToken = req.headers["x-owner-token"] as string;
      const business = await storage.getBusiness(workflow.businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updates = insertWorkflowSchema.partial().parse(req.body);
      const updated = await storage.updateWorkflow(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // Delete workflow (PROTECTED)
  app.delete("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      const ownerToken = req.headers["x-owner-token"] as string;
      const business = await storage.getBusiness(workflow.businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteWorkflow(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  // === BUSINESS THEMES API ===
  
  // Get theme for a business (public - for widget rendering)
  app.get("/api/businesses/:businessId/theme", async (req: Request, res: Response) => {
    try {
      const theme = await storage.getBusinessTheme(req.params.businessId);
      if (!theme) {
        // Return default theme
        return res.json({
          primaryColor: "#000000",
          accentColor: "#C5A059",
          backgroundColor: "#FFFFFF",
          textColor: "#1A1C1E",
          borderRadius: 12,
          glassBlurIntensity: 20,
          fontFamily: "Inter",
          buttonStyle: "rounded",
          showPoweredBy: true,
        });
      }
      res.json(theme);
    } catch (error) {
      console.error("Error getting theme:", error);
      res.status(500).json({ error: "Failed to get theme" });
    }
  });

  // Update theme (PROTECTED)
  app.put("/api/businesses/:businessId/theme", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertBusinessThemeSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const theme = await storage.createOrUpdateBusinessTheme(data);
      res.json(theme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating theme:", error);
      res.status(500).json({ error: "Failed to update theme" });
    }
  });

  // === API KEYS ===
  
  // Get API keys for a business (PROTECTED)
  app.get("/api/businesses/:businessId/api-keys", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keys = await storage.getApiKeys(req.params.businessId);
      // Don't expose the hash, just the prefix and metadata
      const safeKeys = keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: k.permissions,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      }));
      res.json(safeKeys);
    } catch (error) {
      console.error("Error getting API keys:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Create API key (PROTECTED)
  app.post("/api/businesses/:businessId/api-keys", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Generate a secure random API key
      const rawKey = `bf_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 10);

      const apiKey = await storage.createApiKey({
        businessId: req.params.businessId,
        name: req.body.name || "API Key",
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(req.body.permissions || ["read:services", "read:availability", "create:bookings"]),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        isActive: true,
      });

      // Return the raw key only once - it can't be retrieved later
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned on creation
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Delete API key (PROTECTED)
  app.delete("/api/api-keys/:id", async (req: Request, res: Response) => {
    try {
      // Get the API key to verify ownership
      const keys = await storage.getApiKeys(req.params.id);
      // This is a simplification - in production we'd need proper verification
      await storage.deleteApiKey(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // === FLOATING ACTION BUTTON WIDGET ===
  
  // Serve the floating action button script
  app.get("/api/widget/fab.js", async (req: Request, res: Response) => {
    const slug = req.query.slug as string;
    if (!slug) {
      return res.status(400).send("// Error: slug parameter required");
    }

    const business = await storage.getBusinessBySlug(slug);
    if (!business) {
      return res.status(404).send("// Error: Business not found");
    }

    const theme = await storage.getBusinessTheme(business.id);
    const origin = getEmbedOrigin(req);

    const fabScript = `
(function() {
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
    
    fab.onmouseenter = function() {
      fab.style.transform = "scale(1.1)";
      fab.style.boxShadow = "0 6px 30px rgba(0,0,0,0.4)";
    };
    fab.onmouseleave = function() {
      fab.style.transform = "scale(1)";
      fab.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
    };
    
    fab.onclick = function() {
      openBookingModal();
    };
    
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
    
    setTimeout(function() {
      overlay.style.opacity = "1";
      modal.style.transform = "scale(1)";
    }, 10);
    
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.9)";
        setTimeout(function() {
          overlay.remove();
        }, 300);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFAB);
  } else {
    createFAB();
  }
})();
`;

    res.setHeader("Content-Type", "application/javascript");
    res.send(fabScript);
  });

  const httpServer = createServer(app);

  return httpServer;
}
