import type { Application, Request, Response } from "express";
import { initTools, TOOLS_LIST } from "./seo-tools";
import Postmark from "postmark";

const DOMAIN = "https://confirmbooking.online";
const BRAND = "BookFlow";
const TAGLINE = "Smart Booking For Modern Businesses";
const DOWNLOAD_LINK = "https://confirmbooking.online";

// Email Template with Share Preview Look
function getEmailTemplate(businessName: string, bookingLink: string): string {
  return `
    <div style="background-color: #000; color: #f5f5f7; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="margin-bottom: 32px;">
        <span style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Share Preview</span>
        <h1 style="color: #f5f5f7; font-size: 32px; margin: 8px 0;">Your Booking Link</h1>
      </div>

      <div style="background: #007AFF; color: #fff; padding: 12px 20px; border-radius: 18px; margin-bottom: 24px; display: inline-block;">
        Hey! Here's my booking link 👇
      </div>

      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden; margin-bottom: 32px;">
        <div style="background: #111; padding: 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <h2 style="font-size: 48px; line-height: 1; margin: 0; color: #f5f5f7; letter-spacing: -1px;">RESERVE<br>YOUR<br>SPACE</h2>
          <div style="width: 60px; height: 2px; background: #444; margin: 24px auto 0;"></div>
        </div>
        <div style="padding: 24px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff;">
              <img src="https://confirmbooking.online/favicon.png" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div>
              <div style="color: #f5f5f7; font-weight: 600; font-size: 18px;">${businessName}</div>
              <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">BOOK YOUR APPOINTMENT</div>
              <div style="color: #444; font-size: 12px;">CONFIRMBOOKING.ONLINE</div>
            </div>
          </div>
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f5f5f7;">↗</div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${bookingLink}" style="background: #f5f5f7; color: #000; padding: 16px 40px; border-radius: 100px; text-decoration: none; font-weight: 600; display: inline-block;">View Booking Page</a>
      </div>
    </div>
  `;
}

function utmLink(source: string, medium: string, campaign: string, content?: string): string {
  let url = `${DOWNLOAD_LINK}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
  if (content) url += `&utm_content=${content}`;
  return url;
}

function headTags(title: string, description: string, canonical: string, keywords: string): string {
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/png" href="/favicon.png">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${DOMAIN}/favicon.png">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${BRAND}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${DOMAIN}/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'pure-black': '#000',
              'charcoal': '#111',
              'graphite': '#222',
              'smoke': '#444',
              'silver': '#888',
              'pearl': '#f5f5f7',
            },
            fontFamily: {
              heading: ['"Cormorant Garamond"', 'serif'],
              body: ['Inter', 'sans-serif'],
            },
          },
        },
      };
    </script>
    <style>
      :root {
        --pure-black: #000;
        --charcoal: #111;
        --graphite: #222;
        --smoke: #444;
        --silver: #888;
        --pearl: #f5f5f7;
      }
      body {
        background-color: var(--pure-black);
        color: var(--pearl);
        font-family: 'Inter', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .glass-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        transition: all 0.3s ease;
      }
      .glass-card:hover {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.15);
        transform: translateY(-2px);
      }
      .cta-btn {
        display: inline-block;
        background: var(--pearl);
        color: var(--pure-black);
        padding: 16px 40px;
        border-radius: 100px;
        font-weight: 600;
        text-decoration: none;
        letter-spacing: 0.5px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .cta-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 30px rgba(245,245,247,0.15);
      }
      .cta-btn-outline {
        display: inline-block;
        border: 1px solid var(--pearl);
        color: var(--pearl);
        padding: 14px 36px;
        border-radius: 100px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.3s ease;
      }
      .cta-btn-outline:hover {
        background: var(--pearl);
        color: var(--pure-black);
      }
    </style>`;
}

function navBar(): string {
  return `
  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <a href="/seo" class="flex items-center space-x-3">
          <img src="/assets/images/logo.png" alt="${BRAND}" class="w-8 h-8 rounded-lg shadow-2xl">
          <span class="font-heading text-2xl font-semibold text-pearl tracking-tight">${BRAND}</span>
        </a>
        <div class="hidden md:flex items-center space-x-8">
          <a href="/booking-software" class="text-silver hover:text-pearl transition-colors text-sm font-medium">Industries</a>
          <a href="/compare" class="text-silver hover:text-pearl transition-colors text-sm font-medium">Compare</a>
          <a href="/tools" class="text-silver hover:text-pearl transition-colors text-sm font-medium">Free Tools</a>
          <a href="${utmLink("seo", "nav", "header-cta")}" class="cta-btn text-sm !py-2.5 !px-6">Get Started</a>
        </div>
        <div class="md:hidden">
          <a href="${utmLink("seo", "nav", "header-cta-mobile")}" class="cta-btn text-xs !py-2 !px-4">Get Started</a>
        </div>
      </div>
    </div>
  </nav>`;
}

function footer(): string {
  return `
  <footer class="border-t border-white/5 mt-32">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div>
          <div class="flex items-center space-x-3 mb-4">
            <img src="/assets/images/logo.png" alt="${BRAND}" class="w-6 h-6 rounded-md opacity-80">
            <span class="font-heading text-xl font-semibold text-pearl">${BRAND}</span>
          </div>
          <p class="text-silver text-sm leading-relaxed">${TAGLINE}. Trusted by thousands of service professionals to manage their bookings efficiently.</p>
        </div>
        <div>
          <h4 class="text-pearl font-semibold text-sm mb-4 uppercase tracking-wider">Industries</h4>
          <ul class="space-y-2">
            ${INDUSTRIES.slice(0, 8).map(i => `<li><a href="/booking-software/${i}" class="text-silver text-sm hover:text-pearl transition-colors">${formatIndustryName(i)}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h4 class="text-pearl font-semibold text-sm mb-4 uppercase tracking-wider">Compare</h4>
          <ul class="space-y-2">
            ${COMPETITORS.map(c => `<li><a href="/compare/${c}" class="text-silver text-sm hover:text-pearl transition-colors">${BRAND} vs ${formatCompetitorName(c)}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h4 class="text-pearl font-semibold text-sm mb-4 uppercase tracking-wider">Resources</h4>
          <ul class="space-y-2">
            <li><a href="/tools" class="text-silver text-sm hover:text-pearl transition-colors">Free Tools (${TOOLS_LIST.length + 1})</a></li>
            <li><a href="/tools/no-show-calculator" class="text-silver text-sm hover:text-pearl transition-colors">No-Show Calculator</a></li>
            <li><a href="/tools/client-lifetime-value" class="text-silver text-sm hover:text-pearl transition-colors">Client Lifetime Value</a></li>
            <li><a href="/tools/revenue-per-hour" class="text-silver text-sm hover:text-pearl transition-colors">Revenue Per Hour</a></li>
            <li><a href="/booking-software" class="text-silver text-sm hover:text-pearl transition-colors">All Industries</a></li>
            <li><a href="/terms" class="text-silver text-sm hover:text-pearl transition-colors">Terms of Service</a></li>
            <li><a href="/privacy" class="text-silver text-sm hover:text-pearl transition-colors">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p class="text-smoke text-xs">&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        <p class="text-smoke text-xs mt-2 md:mt-0">Powering bookings for modern service businesses worldwide.</p>
      </div>
    </div>
  </footer>`;
}

function breadcrumbs(items: { label: string; href?: string }[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.label,
      ...(item.href ? { "item": `${DOMAIN}${item.href}` } : {}),
    })),
  };
  return `
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <nav class="text-sm mb-8" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center space-x-2 text-silver">
      ${items.map((item, i) => {
        const isLast = i === items.length - 1;
        if (isLast) return `<li class="text-pearl">${item.label}</li>`;
        return `<li><a href="${item.href}" class="hover:text-pearl transition-colors">${item.label}</a></li><li>/</li>`;
      }).join("")}
    </ol>
  </nav>`;
}

function wrapPage(head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>${head}</head>
<body class="bg-pure-black text-pearl font-body antialiased">
${navBar()}
<main class="pt-20">
${body}
</main>
${footer()}
</body>
</html>`;
}

function seoHomepage(): string {
  const head = headTags(
    `${BRAND} | ${TAGLINE}`,
    `${BRAND} is the modern booking platform for service businesses. Reduce no-shows, automate reminders, and let clients book 24/7 online.`,
    DOMAIN,
    "booking software, appointment scheduling, online booking, service business, reduce no-shows, automated reminders"
  );

  const body = `
  <section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-pure-black to-pure-black"></div>
    <div class="relative z-10 max-w-5xl mx-auto text-center">
      <p class="text-silver text-sm uppercase tracking-[0.3em] mb-6 font-medium">The future of appointment management</p>
      <h1 class="font-heading text-5xl sm:text-7xl lg:text-8xl font-semibold mb-8 leading-[0.95] tracking-tight">
        ${TAGLINE.split(" ").slice(0, 2).join(" ")}<br>
        <span class="text-silver">${TAGLINE.split(" ").slice(2).join(" ")}</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light">
        ${BRAND} helps service professionals accept bookings online, reduce no-shows with automated reminders, and grow revenue with smart scheduling tools.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="${utmLink("seo", "organic", "homepage-hero")}" class="cta-btn text-base">Start Free Today</a>
        <a href="/booking-software" class="cta-btn-outline text-base">Explore Industries</a>
      </div>
    </div>
  </section>`;

  return wrapPage(head, body);
}

function comparisonPage(competitor: string): string {
  const compName = formatCompetitorName(competitor);
  const title = `${BRAND} vs ${compName} | Better Booking Software for Service Businesses`;
  const description = `Comparing ${BRAND} vs ${compName}? See why service professionals are switching to ${BRAND}.`;
  const canonical = `${DOMAIN}/compare/${competitor}`;
  const keywords = `${BRAND} vs ${competitor}, alternative`;
  const ctaUrl = utmLink("seo", "comparison", competitor);

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Compare", href: "/compare" },
      { label: `${BRAND} vs ${compName}` },
    ])}
    <h1 class="font-heading text-5xl font-semibold mb-8">${BRAND} vs ${compName}</h1>
    <a href="${ctaUrl}" class="cta-btn">Experience ${BRAND} Free</a>
  </div>`;

  return wrapPage(head, body);
}

function industryDirectoryPage(industry: string): string {
  const industryName = formatIndustryName(industry);
  const head = headTags(`${industryName} Booking Software | ${BRAND}`, `Best booking software for ${industryName.toLowerCase()}.`, `${DOMAIN}/booking-software/${industry}`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-5xl font-semibold mb-8">${industryName} Booking Software</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${LOCATIONS.map(loc => `
        <a href="/booking-software/${industry}/${loc}" class="glass-card rounded-xl p-4 text-center block group">
          <span class="text-silver text-sm group-hover:text-pearl transition-colors">${formatLocationName(loc)}</span>
        </a>
      `).join("")}
    </div>
  </div>`;
  return wrapPage(head, body);
}

function industryLocationPage(industry: string, location: string): string {
  const industryName = formatIndustryName(industry);
  const locationName = formatLocationName(location);
  const head = headTags(`${industryName} Booking in ${locationName} | ${BRAND}`, "", `${DOMAIN}/booking-software/${industry}/${location}`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-5xl font-semibold mb-8">${industryName} in ${locationName}</h1>
    <a href="${utmLink("seo", "location", `${industry}-${location}`)}" class="cta-btn">Get Started Free</a>
  </div>`;
  return wrapPage(head, body);
}

function compareDirectoryPage(): string {
  const head = headTags(`Compare ${BRAND}`, "", `${DOMAIN}/compare`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-5xl font-semibold mb-8">Compare ${BRAND}</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${COMPETITORS.map(c => `<a href="/compare/${c}" class="glass-card rounded-2xl p-8 block group">${BRAND} vs ${formatCompetitorName(c)}</a>`).join("")}
    </div>
  </div>`;
  return wrapPage(head, body);
}

function mainDirectoryPage(): string {
  const head = headTags(`Booking Software by Industry | ${BRAND}`, "", `${DOMAIN}/booking-software`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-5xl font-semibold mb-8">Booking Software by Industry</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${INDUSTRIES.map(i => `<a href="/booking-software/${i}" class="glass-card rounded-2xl p-8 block group">${formatIndustryName(i)}</a>`).join("")}
    </div>
  </div>`;
  return wrapPage(head, body);
}

function toolsDirectoryPage(): string {
  const allTools = [
    { slug: "no-show-calculator", name: "No-Show Cost Calculator", description: "Calculate revenue loss from no-shows.", icon: "$" },
    ...TOOLS_LIST,
  ];
  const head = headTags(`Free Business Tools | ${BRAND}`, "", `${DOMAIN}/tools`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-6xl font-semibold mb-12">Free Business Tools</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${allTools.map(t => `<a href="/tools/${t.slug}" class="glass-card rounded-2xl p-8 block group"><h3 class="font-heading text-2xl mb-2">${t.name}</h3><p class="text-silver text-sm">${t.description}</p></a>`).join("")}
    </div>
  </div>`;
  return wrapPage(head, body);
}

function noShowCalculatorPage(): string {
  const head = headTags(`No-Show Calculator | ${BRAND}`, "", `${DOMAIN}/tools/no-show-calculator`, "");
  const body = `<div class="max-w-4xl mx-auto px-4 py-12"><h1 class="font-heading text-5xl mb-8">No-Show Calculator</h1></div>`;
  return wrapPage(head, body);
}

function generateSitemap(): string {
  const urls: string[] = [`<url><loc>${DOMAIN}/seo</loc><priority>1.0</priority></url>`];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

function generateRobotsTxt(): string {
  return `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml`;
}

export function registerSeoRoutes(app: Application): void {
  initTools({ headTags, breadcrumbs, wrapPage, utmLink, BRAND, DOMAIN });

  app.get("/internal/outreach", (req: Request, res: Response) => {
    // Simplified access for the user
    res.send(`<!DOCTYPE html><html><body style="background:#000;color:#fff;font-family:sans-serif;padding:40px;"><h1 style="font-size:32px;margin-bottom:24px;">Outreach</h1><form id="f" style="display:flex;flex-direction:column;gap:16px;max-width:400px;"><input id="t" type="email" placeholder="Recipient Email" required style="padding:12px;border-radius:8px;border:1px solid #333;background:#111;color:#fff"><input id="b" placeholder="Business Name" required style="padding:12px;border-radius:8px;border:1px solid #333;background:#111;color:#fff"><input id="s" placeholder="Business Slug" required style="padding:12px;border-radius:8px;border:1px solid #333;background:#111;color:#fff"><button style="padding:16px;border-radius:8px;background:#fff;color:#000;font-weight:bold;cursor:pointer">Send Booking Preview</button></form><div id="m" style="margin-top:20px;font-weight:500;"></div><script>
      const nameInput = document.getElementById('b');
      const slugInput = document.getElementById('s');
      nameInput.oninput = () => {
        slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      };
      document.getElementById('f').onsubmit=async(e)=>{
        e.preventDefault();
        const m=document.getElementById('m');
        m.innerText='Sending...';
        m.style.color='#fff';
        try {
          const r=await fetch('/api/internal/send-outreach',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              to:document.getElementById('t').value,
              businessName:document.getElementById('b').value,
              slug:document.getElementById('s').value
            })
          });
          if(r.ok){
            m.innerText='✅ Email sent successfully!';
            m.style.color='#10b981';
          }else{
            const t=await r.text();
            m.innerText='❌ Error: '+t;
            m.style.color='#ef4444';
          }
        } catch(err) {
          m.innerText='❌ Connection error';
          m.style.color='#ef4444';
        }
      }
    </script></body></html>`);
  });

  app.post("/api/internal/send-outreach", async (req: Request, res: Response) => {
    const { to, businessName, slug } = req.body;
    if (!to || !businessName || !slug) return res.status(400).send("Missing fields");
    
    try {
      const client = new Postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
      await client.sendEmail({
        From: "hello@confirmbooking.online",
        To: to,
        Subject: `Booking Preview for ${businessName}`,
        HtmlBody: getEmailTemplate(businessName, `https://confirmbooking.online/book/${slug}`),
        MessageStream: "outbound"
      });
      res.sendStatus(200);
    } catch (e: any) { 
      console.error("Outreach Error:", e);
      res.status(500).send(e.message); 
    }
  });

  app.get("/seo", (req, res) => res.send(seoHomepage()));
  app.get("/booking-software", (req, res) => res.send(mainDirectoryPage()));
  app.get("/booking-software/:i", (req, res) => res.send(industryDirectoryPage(req.params.i)));
  app.get("/booking-software/:i/:l", (req, res) => res.send(industryLocationPage(req.params.i, req.params.l)));
  app.get("/compare", (req, res) => res.send(compareDirectoryPage()));
  app.get("/compare/:c", (req, res) => res.send(comparisonPage(req.params.c)));
  app.get("/tools", (req, res) => res.send(toolsDirectoryPage()));
  app.get("/tools/no-show-calculator", (req, res) => res.send(noShowCalculatorPage()));
  for (const t of TOOLS_LIST) { app.get(`/tools/${t.slug}`, (req, res) => res.send(t.fn())); }
  app.get("/sitemap.xml", (req, res) => { res.setHeader("Content-Type", "application/xml"); res.send(generateSitemap()); });
  app.get("/robots.txt", (req, res) => res.send(generateRobotsTxt()));
}

const INDUSTRIES = ["salon", "barbershop", "spa", "auto-detailing", "fitness", "yoga", "dental", "medical", "veterinary", "tattoo", "massage", "photography", "tutoring", "consulting", "coaching", "cleaning", "plumbing", "electrical", "hvac", "landscaping"];
const LOCATIONS = ["new-york", "los-angeles", "chicago", "houston", "phoenix", "philadelphia", "san-antonio", "san-diego", "dallas", "san-jose", "austin", "jacksonville", "san-francisco", "columbus", "charlotte", "indianapolis", "seattle", "denver", "washington-dc", "nashville", "atlanta", "miami", "tampa", "portland", "las-vegas", "sacramento", "mesa", "kansas-city", "long-beach", "raleigh", "oakland", "minneapolis", "tulsa", "bakersfield", "aurora", "anaheim", "honolulu", "santa-ana", "riverside", "stockton", "henderson", "st-louis", "pittsburgh", "cincinnati", "milwaukee", "orlando", "boise", "tucson", "omaha", "el-paso", "detroit"];
const COMPETITORS = ["calendly", "acuity-scheduling", "square-appointments", "vagaro", "mindbody", "fresha", "booksy", "setmore", "simplybook", "schedulicity"];

function formatIndustryName(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatLocationName(s: string) { return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }
function formatCompetitorName(s: string) { return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }
