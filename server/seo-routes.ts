import type { Application, Request, Response } from "express";
import { initTools, TOOLS_LIST } from "./seo-tools";
import Postmark from "postmark";
import QRCode from "qrcode";

const DOMAIN = "https://confirmbooking.online";
const BRAND = "BookFlow";
const TAGLINE = "Smart Booking For Modern Businesses";
const DOWNLOAD_LINK = "https://confirmbooking.online";

function renderConfirmationPreview(businessName: string, niche: string = "auto-detailing"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, { name: string; price: string }> = {
    "auto-detailing": { name: "Interior Detail", price: "$175.00" },
    "salon": { name: "Haircut & Style", price: "$55.00" },
    "barbershop": { name: "Classic Haircut", price: "$35.00" },
    "spa": { name: "Swedish Massage", price: "$90.00" },
    "fitness": { name: "Personal Training", price: "$75.00" },
    "tattoo": { name: "Small Tattoo", price: "$100.00" },
    "massage": { name: "Deep Tissue", price: "$120.00" }
  };
  const service = services[niche] || services["auto-detailing"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; font-family: 'Inter', sans-serif;">${upperName}</div>
        <div style="font-family: 'Inter', sans-serif; font-size: 42px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">CONFIRMED</div>
        <div style="color: #888; font-size: 14px; font-family: 'Inter', sans-serif;">Your booking has been secured</div>
      </div>
      <div style="padding: 24px 32px;">
        <div style="color: #f5f5f7; font-size: 20px; font-family: 'Inter', sans-serif; margin-bottom: 20px;">Hi John Smith,</div>
        <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">CONFIRMATION</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">B7E6AD10</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">SERVICE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service.name}</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">DATE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Friday, February 13, 2026</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">TIME</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">4:00 PM</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);"></td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">TOTAL</td>
              <td style="color: #f5f5f7; font-size: 28px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service.price}</td>
            </tr>
          </table>
        </div>
      </div>
      <div style="padding: 0 32px 20px; text-align: center;">
        <div style="color: #666; font-size: 13px; font-style: italic; font-family: 'Inter', sans-serif;">Need to reschedule? Contact ${businessName} directly.</div>
      </div>
      <div style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="color: #444; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-family: 'Inter', sans-serif;">POWERED BY BOOKFLOW</div>
      </div>
    </div>`;
}

function renderReminderPreview(businessName: string, niche: string = "auto-detailing"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, { name: string; price: string }> = {
    "auto-detailing": { name: "Interior Detail", price: "$175.00" },
    "salon": { name: "Haircut & Style", price: "$55.00" },
    "barbershop": { name: "Classic Haircut", price: "$35.00" },
    "spa": { name: "Swedish Massage", price: "$90.00" },
    "fitness": { name: "Personal Training", price: "$75.00" },
    "tattoo": { name: "Small Tattoo", price: "$100.00" },
    "massage": { name: "Deep Tissue", price: "$120.00" }
  };
  const service = services[niche] || services["auto-detailing"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; font-family: 'Inter', sans-serif;">${upperName}</div>
        <div style="font-family: 'Inter', sans-serif; font-size: 42px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">REMINDER</div>
        <div style="color: #888; font-size: 14px; font-family: 'Inter', sans-serif;">Your appointment is coming up soon</div>
      </div>
      <div style="padding: 24px 32px;">
        <div style="color: #f5f5f7; font-size: 20px; font-family: 'Inter', sans-serif; margin-bottom: 20px;">Hi John Smith,</div>
        <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">CONFIRMATION</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">B7E6AD10</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">SERVICE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service.name}</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">DATE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Friday, February 13, 2026</td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">TIME</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">4:00 PM</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);"></td>
            </tr>
            <tr>
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">TOTAL</td>
              <td style="color: #f5f5f7; font-size: 28px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service.price}</td>
            </tr>
          </table>
        </div>
      </div>
      <div style="padding: 0 32px 20px; text-align: center;">
        <div style="color: #666; font-size: 13px; font-style: italic; font-family: 'Inter', sans-serif;">Need to reschedule? Contact ${businessName} directly.</div>
      </div>
      <div style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="color: #444; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-family: 'Inter', sans-serif;">POWERED BY BOOKFLOW</div>
      </div>
    </div>`;
}

function getEmailTemplate(businessName: string, bookingLink: string, slug: string, niche: string = "auto-detailing"): string {
  const qrImageUrl = `${DOMAIN}/api/qr/${encodeURIComponent(slug)}`;

  return `
    <div style="background-color: #000; color: #f5f5f7; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="margin-bottom: 32px; text-align: center;">
        <img src="${DOMAIN}/favicon.png" style="width: 48px; height: 48px; margin-bottom: 16px;">
        <h1 style="color: #f5f5f7; font-size: 32px; margin: 8px 0; font-family: 'Cormorant Garamond', serif;">Your Smart Booking Link & QR Code for ${businessName}</h1>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">Hi there,</p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">
        I noticed <strong>${businessName}</strong> offers services that rely on customer appointments, and I wanted to share something that could immediately help increase confirmed bookings and reduce no-shows.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 16px;">
        We've created a custom smart booking link and QR code specifically for <strong>${businessName}</strong> that allows customers to:
      </p>

      <ul style="color: #ccc; padding-left: 20px; margin-bottom: 24px; line-height: 1.8;">
        <li>Book services instantly from their phone</li>
        <li>Receive automatic confirmations and reminders</li>
        <li>Avoid double bookings or missed messages</li>
        <li>Access your services 24/7 without calling</li>
      </ul>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">
        This gives your business a professional, always-on booking system without changing how you currently operate. You simply share the link or print the QR code, and customers handle the rest.
      </p>

      <div style="margin-bottom: 40px;">
        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Your Custom Booking Link</div>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: #111; padding: 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; line-height: 1; margin: 0; color: #f5f5f7; letter-spacing: -1px;">RESERVE<br>YOUR<br>SPACE</h2>
            <div style="width: 60px; height: 2px; background: #444; margin: 24px auto 0;"></div>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%;"><tr>
              <td style="width: 44px; vertical-align: middle;">
                <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #fff;">
                  <img src="${DOMAIN}/favicon.png" style="width: 40px; height: 40px; display: block;">
                </div>
              </td>
              <td style="vertical-align: middle; padding-left: 12px;">
                <div style="color: #f5f5f7; font-weight: 600; font-size: 18px;">${businessName}</div>
                <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">BOOK YOUR APPOINTMENT</div>
                <div style="color: #444; font-size: 12px;">CONFIRMBOOKING.ONLINE</div>
              </td>
              <td style="width: 36px; vertical-align: middle; text-align: right;">
                <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 32px; color: #f5f5f7; font-size: 16px;">↗</div>
              </td>
            </tr></table>
          </div>
        </div>
        
        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Your Smart QR Code</div>
        <div style="background: #111; padding: 40px; border-radius: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px;">
          <div style="background: #fff; padding: 24px; border-radius: 24px; display: inline-block;">
            <img src="${qrImageUrl}" alt="QR Code for ${businessName}" style="width: 200px; height: 200px; display: block;">
          </div>
          <div style="margin-top: 24px;">
            <div style="color: #f5f5f7; font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">${businessName}</div>
            <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px;">SCAN TO BOOK</div>
          </div>
        </div>

        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Automated Confirmations</div>
        <div style="margin-bottom: 24px;">
          ${renderConfirmationPreview(businessName, niche)}
        </div>

        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Automated Reminders</div>
        <div style="margin-bottom: 32px;">
          ${renderReminderPreview(businessName, niche)}
        </div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">
        There's no complicated setup and you can start seeing results immediately. Many service businesses use this to improve customer convenience and capture bookings they would normally lose outside business hours.
      </p>

      <p style="font-size: 18px; line-height: 1.6; color: #f5f5f7; margin-bottom: 32px; text-align: center; font-weight: 600;">
        And the best part? All of this costs less than 2 cups of coffee a month. ☕☕
      </p>

      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 32px; margin-bottom: 32px;">
        <p style="color: #888; font-size: 14px; margin-bottom: 24px;">Try your custom booking demo:</p>
        <a href="${bookingLink}" style="background: #f5f5f7; color: #000; padding: 18px 48px; border-radius: 100px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">View Booking Page</a>
      </div>

      <p style="font-size: 14px; color: #888; line-height: 1.6;">
        If you'd like, I can also enable automated reminders and smart follow-ups to further reduce missed appointments.
      </p>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #f5f5f7; font-weight: 600; margin-bottom: 4px;">BookFlow</p>
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Smart Booking for Service Businesses</p>
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

function outreachPage(): string {
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Outreach Command Center | ${BRAND}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background: #000; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
      input, select, textarea { background: #111 !important; border: 1px solid #222 !important; color: #fff !important; }
      input:focus, select:focus, textarea:focus { border-color: #444 !important; outline: none; }
      .tab-active { background: #fff; color: #000; }
      .tab-inactive { background: transparent; color: #666; border: 1px solid #222; }
      .tab-inactive:hover { color: #fff; border-color: #444; }
      .lead-row:hover { background: rgba(255,255,255,0.03); }
      .lead-row.sent { opacity: 0.4; }
      .progress-bar { transition: width 0.3s ease; }
      @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      .pulse-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
    </style>
  </head>
  <body class="min-h-screen p-6">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img src="/favicon.png" class="w-10 h-10">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Outreach Command Center</h1>
            <p class="text-gray-500 text-xs mt-1">Generate leads, import lists, send premium booking previews</p>
          </div>
        </div>
        <div id="stats" class="text-right text-xs text-gray-500">
          <div>Sent this session: <span id="sent-count" class="text-white font-bold">0</span></div>
          <div>Queue: <span id="queue-count" class="text-white font-bold">0</span></div>
        </div>
      </div>

      <div class="flex gap-2 mb-6">
        <button onclick="switchTab('single')" id="tab-single" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all tab-active">Single Send</button>
        <button onclick="switchTab('bulk')" id="tab-bulk" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all tab-inactive">Bulk Import</button>
        <button onclick="switchTab('manus')" id="tab-manus" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all tab-inactive">Generate Leads</button>
        <button onclick="switchTab('history')" id="tab-history" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all tab-inactive">History</button>
      </div>

      <!-- SINGLE SEND TAB -->
      <div id="panel-single" class="panel">
        <form id="single-form" class="space-y-4 max-w-md">
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Recipient Email</label>
            <input id="single-email" type="email" placeholder="client@example.com" required class="w-full p-4 rounded-2xl text-base">
          </div>
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Business Name</label>
            <input id="single-name" placeholder="Luxury Auto Spa" required class="w-full p-4 rounded-2xl text-base">
          </div>
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Business Slug</label>
            <input id="single-slug" placeholder="luxury-auto-spa" required class="w-full p-4 rounded-2xl text-base text-gray-400">
          </div>
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Industry Niche</label>
            <select id="single-niche" class="w-full p-4 rounded-2xl text-base">
              <option value="auto-detailing">Auto Detailing</option>
              <option value="salon">Hair Salon</option>
              <option value="barbershop">Barbershop</option>
              <option value="fitness">Fitness / Gym</option>
              <option value="spa">Spa / Wellness</option>
              <option value="tattoo">Tattoo Studio</option>
              <option value="massage">Massage Therapy</option>
            </select>
          </div>
          <button type="submit" class="w-full py-5 mt-4 rounded-2xl bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl">Send Booking Preview</button>
        </form>
        <div id="single-msg" class="mt-6 text-center font-medium min-h-[24px]"></div>
      </div>

      <!-- BULK IMPORT TAB -->
      <div id="panel-bulk" class="panel hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Paste Manus Lead List</label>
            <textarea id="bulk-input" rows="14" placeholder="Paste the markdown table or CSV from Manus here...

Example:
| Business Name | Email Address | Phone Number | Address |
| Organic Spa | organic.spa@gmail.com | (773) 710-7810 | 520 N Michigan Ave |
..." class="w-full p-4 rounded-2xl text-sm font-mono leading-relaxed resize-none"></textarea>
            <div class="flex gap-3 mt-3">
              <div class="flex-1">
                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Niche for All</label>
                <select id="bulk-niche" class="w-full p-3 rounded-xl text-sm">
                  <option value="auto-detailing">Auto Detailing</option>
                  <option value="salon">Hair Salon</option>
                  <option value="barbershop">Barbershop</option>
                  <option value="fitness">Fitness / Gym</option>
                  <option value="spa">Spa / Wellness</option>
                  <option value="tattoo">Tattoo Studio</option>
                  <option value="massage">Massage Therapy</option>
                </select>
              </div>
              <div class="flex items-end">
                <button onclick="parseBulkInput()" class="px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform">Parse Leads</button>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs uppercase tracking-widest text-gray-500 ml-1">Parsed Leads (<span id="parsed-count">0</span>)</label>
              <div class="flex gap-2">
                <button onclick="selectAllLeads()" class="text-xs text-gray-400 hover:text-white transition-colors">Select All</button>
                <button onclick="deselectAllLeads()" class="text-xs text-gray-400 hover:text-white transition-colors">Deselect All</button>
              </div>
            </div>
            <div id="parsed-leads" class="border border-gray-800 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
              <div class="p-8 text-center text-gray-600 text-sm">Paste and parse leads to see them here</div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex items-center justify-between">
          <div id="bulk-progress" class="flex-1 mr-4 hidden">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
              <span id="bulk-progress-text" class="text-sm text-gray-400">Sending...</span>
            </div>
            <div class="w-full bg-gray-800 rounded-full h-2">
              <div id="bulk-progress-bar" class="bg-white h-2 rounded-full progress-bar" style="width: 0%"></div>
            </div>
          </div>
          <button onclick="sendAllSelected()" id="send-all-btn" class="px-8 py-4 rounded-2xl bg-white text-black font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl whitespace-nowrap">
            Send All Selected
          </button>
        </div>
        <div id="bulk-msg" class="mt-4 text-center font-medium min-h-[24px]"></div>
      </div>

      <!-- GENERATE LEADS TAB (MANUS) -->
      <div id="panel-manus" class="panel hidden">
        <div class="max-w-md">
          <div class="space-y-4">
            <div>
              <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Industry Niche</label>
              <select id="manus-niche" class="w-full p-4 rounded-2xl text-base">
                <option value="auto-detailing">Auto Detailing</option>
                <option value="salon">Hair Salon</option>
                <option value="barbershop">Barbershop</option>
                <option value="fitness">Fitness / Gym</option>
                <option value="spa">Spa / Wellness</option>
                <option value="tattoo">Tattoo Studio</option>
                <option value="massage">Massage Therapy</option>
              </select>
            </div>
            <div>
              <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">City</label>
              <input id="manus-city" placeholder="Chicago, IL" class="w-full p-4 rounded-2xl text-base">
            </div>
            <button onclick="generateLeads()" id="generate-btn" class="w-full py-5 mt-4 rounded-2xl bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl">
              Generate Leads with Manus
            </button>
          </div>
          <div id="manus-status" class="mt-6 min-h-[24px]"></div>
        </div>
        <div id="manus-results" class="mt-6 hidden">
          <div class="flex items-center justify-between mb-3">
            <label class="text-xs uppercase tracking-widest text-gray-500 ml-1">Generated Leads</label>
            <button onclick="importManusToQueue()" class="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform">Import to Send Queue</button>
          </div>
          <div id="manus-leads-list" class="border border-gray-800 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto"></div>
        </div>
      </div>

      <!-- HISTORY TAB -->
      <div id="panel-history" class="panel hidden">
        <div class="flex items-center justify-between mb-4">
          <label class="text-xs uppercase tracking-widest text-gray-500 ml-1">Sent Emails (<span id="history-count">0</span>)</label>
          <button onclick="clearHistory()" class="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear History</button>
        </div>
        <div id="history-list" class="border border-gray-800 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
          <div class="p-8 text-center text-gray-600 text-sm">No emails sent yet this session</div>
        </div>
      </div>
    </div>

    <script>
      let parsedLeads = [];
      let sentHistory = JSON.parse(localStorage.getItem('outreach_history') || '[]');
      let sessionSent = 0;

      function toSlug(name) {
        return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }

      function switchTab(tab) {
        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('[id^="tab-"]').forEach(t => { t.className = t.className.replace('tab-active', 'tab-inactive'); });
        document.getElementById('panel-' + tab).classList.remove('hidden');
        document.getElementById('tab-' + tab).className = document.getElementById('tab-' + tab).className.replace('tab-inactive', 'tab-active');
        if (tab === 'history') renderHistory();
      }

      // Auto-slug for single send
      document.getElementById('single-name').oninput = function() {
        document.getElementById('single-slug').value = toSlug(this.value);
      };

      // Single send form
      document.getElementById('single-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const msg = document.getElementById('single-msg');
        btn.disabled = true; btn.style.opacity = '0.5';
        msg.innerText = 'Sending...'; msg.className = 'mt-6 text-center font-medium text-white animate-pulse';
        try {
          const r = await fetch('/api/internal/send-outreach', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              to: document.getElementById('single-email').value,
              businessName: document.getElementById('single-name').value,
              slug: document.getElementById('single-slug').value,
              niche: document.getElementById('single-niche').value
            })
          });
          if (r.ok) {
            addToHistory(document.getElementById('single-email').value, document.getElementById('single-name').value, document.getElementById('single-niche').value);
            msg.innerText = 'Sent successfully!'; msg.className = 'mt-6 text-center font-medium text-green-400';
            e.target.reset();
          } else {
            msg.innerText = 'Error: ' + await r.text(); msg.className = 'mt-6 text-center font-medium text-red-400';
          }
        } catch(err) {
          msg.innerText = 'Connection error'; msg.className = 'mt-6 text-center font-medium text-red-400';
        } finally { btn.disabled = false; btn.style.opacity = '1'; }
      };

      // Parse bulk input (markdown table or CSV)
      function parseBulkInput() {
        const raw = document.getElementById('bulk-input').value.trim();
        if (!raw) return;
        const niche = document.getElementById('bulk-niche').value;
        parsedLeads = [];

        const lines = raw.split('\\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.includes('---') || line.toLowerCase().includes('business name') || line.toLowerCase().includes('email address')) continue;
          
          let parts;
          if (line.includes('|')) {
            parts = line.split('|').map(p => p.trim()).filter(p => p);
          } else {
            parts = line.split(',').map(p => p.trim()).filter(p => p);
          }
          
          if (parts.length < 2) continue;

          let name = parts[0].replace(/\\*\\*/g, '').trim();
          let email = '';
          let phone = '';
          let address = '';

          for (const part of parts.slice(1)) {
            const cleaned = part.trim();
            if (cleaned.includes('@')) email = cleaned;
            else if (cleaned.match(/\\(\\d{3}\\)|\\d{3}-/)) phone = cleaned;
            else if (cleaned !== 'N/A' && cleaned.length > 5) address = cleaned;
          }

          if (name && email) {
            const alreadySent = sentHistory.some(h => h.email === email);
            parsedLeads.push({ name, email, phone, address, niche, slug: toSlug(name), selected: !alreadySent, sent: alreadySent });
          }
        }

        renderParsedLeads();
        updateCounts();
      }

      function renderParsedLeads() {
        const container = document.getElementById('parsed-leads');
        document.getElementById('parsed-count').textContent = parsedLeads.length;
        
        if (parsedLeads.length === 0) {
          container.innerHTML = '<div class="p-8 text-center text-gray-600 text-sm">No valid leads found. Check your paste format.</div>';
          return;
        }

        let html = '<table class="w-full text-xs"><thead><tr class="border-b border-gray-800 text-gray-500 uppercase tracking-widest">';
        html += '<th class="p-3 text-left w-8"><input type="checkbox" checked onchange="toggleAllLeads(this.checked)"></th>';
        html += '<th class="p-3 text-left">Business</th><th class="p-3 text-left">Email</th><th class="p-3 text-left">Status</th></tr></thead><tbody>';

        parsedLeads.forEach((lead, i) => {
          const statusClass = lead.sent ? 'text-yellow-500' : 'text-gray-500';
          const statusText = lead.sent ? 'Already sent' : 'Ready';
          html += '<tr class="lead-row border-b border-gray-800/50 ' + (lead.sent ? 'sent' : '') + '">';
          html += '<td class="p-3"><input type="checkbox" ' + (lead.selected ? 'checked' : '') + ' onchange="parsedLeads[' + i + '].selected=this.checked; updateCounts();" ' + (lead.sent ? 'disabled' : '') + '></td>';
          html += '<td class="p-3"><div class="font-medium text-white">' + lead.name + '</div><div class="text-gray-600 mt-0.5">' + lead.slug + '</div></td>';
          html += '<td class="p-3 text-gray-400">' + lead.email + '</td>';
          html += '<td class="p-3 ' + statusClass + '">' + statusText + '</td>';
          html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
      }

      function selectAllLeads() { parsedLeads.forEach(l => { if (!l.sent) l.selected = true; }); renderParsedLeads(); updateCounts(); }
      function deselectAllLeads() { parsedLeads.forEach(l => l.selected = false); renderParsedLeads(); updateCounts(); }
      function toggleAllLeads(checked) { parsedLeads.forEach(l => { if (!l.sent) l.selected = checked; }); renderParsedLeads(); updateCounts(); }

      function updateCounts() {
        const queued = parsedLeads.filter(l => l.selected && !l.sent).length;
        document.getElementById('queue-count').textContent = queued;
        document.getElementById('sent-count').textContent = sessionSent;
      }

      // Send all selected leads with rate limiting
      async function sendAllSelected() {
        const toSend = parsedLeads.filter(l => l.selected && !l.sent);
        if (toSend.length === 0) return;

        const btn = document.getElementById('send-all-btn');
        const progress = document.getElementById('bulk-progress');
        const progressBar = document.getElementById('bulk-progress-bar');
        const progressText = document.getElementById('bulk-progress-text');
        const msg = document.getElementById('bulk-msg');

        btn.disabled = true; btn.style.opacity = '0.5';
        progress.classList.remove('hidden');
        msg.innerText = '';

        let sent = 0;
        let failed = 0;

        for (const lead of toSend) {
          progressText.textContent = 'Sending to ' + lead.name + '... (' + (sent + failed + 1) + '/' + toSend.length + ')';
          progressBar.style.width = ((sent + failed) / toSend.length * 100) + '%';

          try {
            const r = await fetch('/api/internal/send-outreach', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ to: lead.email, businessName: lead.name, slug: lead.slug, niche: lead.niche })
            });
            if (r.ok) {
              lead.sent = true;
              lead.selected = false;
              sent++;
              sessionSent++;
              addToHistory(lead.email, lead.name, lead.niche);
            } else { failed++; }
          } catch { failed++; }

          renderParsedLeads();
          updateCounts();

          // Rate limit: 1.5 second delay between sends
          if (sent + failed < toSend.length) await new Promise(r => setTimeout(r, 1500));
        }

        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        msg.innerText = sent + ' sent' + (failed > 0 ? ', ' + failed + ' failed' : '');
        msg.className = 'mt-4 text-center font-medium ' + (failed > 0 ? 'text-yellow-400' : 'text-green-400');
        btn.disabled = false; btn.style.opacity = '1';
        setTimeout(() => progress.classList.add('hidden'), 3000);
      }

      // Manus lead generation
      async function generateLeads() {
        const niche = document.getElementById('manus-niche').value;
        const city = document.getElementById('manus-city').value;
        if (!city) { document.getElementById('manus-status').innerHTML = '<div class="text-red-400 text-sm">Enter a city</div>'; return; }

        const btn = document.getElementById('generate-btn');
        const status = document.getElementById('manus-status');
        btn.disabled = true; btn.style.opacity = '0.5';
        btn.textContent = 'Starting Manus...';
        status.innerHTML = '<div class="flex items-center gap-2 text-sm text-gray-400"><div class="w-2 h-2 rounded-full bg-blue-400 pulse-dot"></div>Creating task...</div>';

        try {
          const r = await fetch('/api/internal/generate-leads', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ niche, city })
          });
          
          if (!r.ok) {
            const err = await r.json();
            status.innerHTML = '<div class="text-red-400 text-sm">' + (err.error || 'Failed') + '</div>';
            btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Generate Leads with Manus';
            return;
          }

          const data = await r.json();
          status.innerHTML = '<div class="space-y-2">' +
            '<div class="flex items-center gap-2 text-sm text-green-400"><div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>Task created! Manus is researching...</div>' +
            '<div class="text-xs text-gray-500">Task ID: ' + data.taskId + '</div>' +
            (data.taskUrl ? '<a href="' + data.taskUrl + '" target="_blank" class="text-xs text-blue-400 hover:underline">View on Manus</a>' : '') +
            '<div class="text-xs text-gray-500 mt-2">This typically takes 2-5 minutes. You can check the Manus dashboard or paste results in the Bulk Import tab when ready.</div>' +
            '</div>';

          btn.textContent = 'Generate More Leads';
          btn.disabled = false; btn.style.opacity = '1';
        } catch(err) {
          status.innerHTML = '<div class="text-red-400 text-sm">Connection error</div>';
          btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Generate Leads with Manus';
        }
      }

      // History management
      function addToHistory(email, name, niche) {
        const entry = { email, name, niche, timestamp: new Date().toISOString() };
        sentHistory.unshift(entry);
        if (sentHistory.length > 500) sentHistory = sentHistory.slice(0, 500);
        localStorage.setItem('outreach_history', JSON.stringify(sentHistory));
        sessionSent++;
        updateCounts();
      }

      function renderHistory() {
        const container = document.getElementById('history-list');
        document.getElementById('history-count').textContent = sentHistory.length;

        if (sentHistory.length === 0) {
          container.innerHTML = '<div class="p-8 text-center text-gray-600 text-sm">No emails sent yet</div>';
          return;
        }

        let html = '<table class="w-full text-xs"><thead><tr class="border-b border-gray-800 text-gray-500 uppercase tracking-widest">';
        html += '<th class="p-3 text-left">Business</th><th class="p-3 text-left">Email</th><th class="p-3 text-left">Niche</th><th class="p-3 text-left">Sent</th></tr></thead><tbody>';

        sentHistory.forEach(h => {
          const time = new Date(h.timestamp).toLocaleString();
          html += '<tr class="border-b border-gray-800/50">';
          html += '<td class="p-3 text-white font-medium">' + h.name + '</td>';
          html += '<td class="p-3 text-gray-400">' + h.email + '</td>';
          html += '<td class="p-3 text-gray-500">' + h.niche + '</td>';
          html += '<td class="p-3 text-gray-600">' + time + '</td>';
          html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
      }

      function clearHistory() {
        if (!confirm('Clear all sent history?')) return;
        sentHistory = [];
        localStorage.removeItem('outreach_history');
        renderHistory();
        updateCounts();
      }

      // Import Manus results to bulk queue
      function importManusToQueue() {
        switchTab('bulk');
        document.getElementById('bulk-niche').value = document.getElementById('manus-niche').value;
      }

      // Init
      updateCounts();
    </script>
  </body></html>`;
}

export function registerSeoRoutes(app: Application): void {
  initTools({ headTags, breadcrumbs, wrapPage, utmLink, BRAND, DOMAIN });

  app.get("/api/qr/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const bookingUrl = `https://confirmbooking.online/book/${slug}`;
      const qrBuffer = await QRCode.toBuffer(bookingUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
        type: "png" as const
      });
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(qrBuffer);
    } catch (e: any) {
      console.error("QR generation error:", e);
      res.status(500).send("QR generation failed");
    }
  });

  app.get("/internal/outreach", (req: Request, res: Response) => {
    res.send(outreachPage());
  });

  app.post("/api/internal/send-outreach", async (req: Request, res: Response) => {
    const { to, businessName, slug, niche } = req.body;
    if (!to || !businessName || !slug) return res.status(400).send("Missing fields");
    
    try {
      const client = new Postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
      const bookingLink = niche ? `https://confirmbooking.online/book/${slug}?niche=${encodeURIComponent(niche)}` : `https://confirmbooking.online/book/${slug}`;
      const emailHtml = getEmailTemplate(businessName, bookingLink, slug, niche);
      await client.sendEmail({
        From: `BookFlow - ${businessName} <hello@confirmbooking.online>`,
        To: to,
        Subject: `Your Smart Booking Link & QR Code for ${businessName}`,
        HtmlBody: emailHtml,
        MessageStream: "outbound"
      });
      res.sendStatus(200);
    } catch (e: any) { 
      console.error("Outreach Error:", e);
      res.status(500).send(e.message); 
    }
  });

  app.post("/api/internal/generate-leads", async (req: Request, res: Response) => {
    const { niche, city } = req.body;
    if (!niche || !city) return res.status(400).json({ error: "Missing niche or city" });

    const apiKey = process.env.MANUS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Manus API key not configured" });

    try {
      const nicheLabels: Record<string, string> = {
        "auto-detailing": "auto detailing",
        "salon": "hair salon",
        "barbershop": "barbershop",
        "fitness": "fitness and gym",
        "spa": "spa and wellness",
        "tattoo": "tattoo studio",
        "massage": "massage therapy"
      };
      const nicheLabel = nicheLabels[niche] || niche;

      const response = await fetch("https://api.manus.ai/v1/tasks", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "API_KEY": apiKey
        },
        body: JSON.stringify({
          prompt: `Find ${nicheLabel} businesses in ${city} that use a Gmail address for their primary contact. Return a structured list with columns: Business Name, Email Address, Phone Number, Address. Format as a markdown table. Focus on businesses that would benefit from an online booking system. Find at least 15-25 businesses.`,
          agentProfile: "manus-1.6"
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Manus API error:", errText);
        return res.status(response.status).json({ error: "Manus API error", details: errText });
      }

      const data = await response.json();
      res.json({ 
        taskId: data.task_id,
        taskUrl: data.task_url,
        shareUrl: data.share_url,
        title: data.task_title
      });
    } catch (e: any) {
      console.error("Manus lead gen error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/internal/manus-task/:taskId", async (req: Request, res: Response) => {
    const apiKey = process.env.MANUS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Manus API key not configured" });

    try {
      const response = await fetch(`https://api.manus.ai/v1/tasks?query=${req.params.taskId}&limit=1`, {
        headers: {
          "accept": "application/json",
          "API_KEY": apiKey
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch task" });
      }

      const data = await response.json();
      const task = data.data?.find((t: any) => t.id === req.params.taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      res.json({
        status: task.status,
        output: task.output,
        title: task.metadata?.task_title
      });
    } catch (e: any) {
      console.error("Manus task fetch error:", e);
      res.status(500).json({ error: e.message });
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
  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    res.send(generateSitemap());
  });
  app.get("/robots.txt", (req, res) => {
    res.header("Content-Type", "text/plain");
    res.send(generateRobotsTxt());
  });
}

function formatIndustryName(i: string) { return i.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }
function formatCompetitorName(c: string) { return c.charAt(0).toUpperCase() + c.slice(1); }
function formatLocationName(l: string) { return l.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }

const INDUSTRIES = ["salon", "barbershop", "fitness", "spa", "tattoo", "massage", "auto-detailing", "personal-trainer", "yoga", "therapy"];
const COMPETITORS = ["calendly", "acuity", "vagaro", "mindbody", "fresha"];
const LOCATIONS = ["new-york", "los-angeles", "chicago", "houston", "phoenix", "philadelphia", "san-antonio", "san-diego", "dallas", "san-jose"];
