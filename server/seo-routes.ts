import type { Application, Request, Response } from "express";
import { initTools, TOOLS_LIST } from "./seo-tools";
import Postmark from "postmark";
import QRCode from "qrcode";

const DOMAIN = "https://confirmbooking.online";
const BRAND = "BookFlow";
const TAGLINE = "Smart Booking For Modern Businesses";
const DOWNLOAD_LINK = "https://confirmbooking.online";

function renderConfirmationPreview(businessName: string): string {
  const upperName = businessName.toUpperCase();
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
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Interior Detail</td>
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
              <td style="color: #f5f5f7; font-size: 28px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">$175.00</td>
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

function renderReminderPreview(businessName: string): string {
  const upperName = businessName.toUpperCase();
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
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Interior Detail</td>
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
              <td style="color: #f5f5f7; font-size: 28px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">$175.00</td>
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

async function getEmailTemplate(businessName: string, bookingLink: string, niche: string = "auto-detailing"): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(bookingLink, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M"
  });

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
            <img src="${qrDataUrl}" alt="QR Code for ${businessName}" style="width: 200px; height: 200px; display: block;">
          </div>
          <div style="margin-top: 24px;">
            <div style="color: #f5f5f7; font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">${businessName}</div>
            <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px;">SCAN TO BOOK</div>
          </div>
        </div>

        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Automated Confirmations</div>
        <div style="margin-bottom: 24px;">
          ${renderConfirmationPreview(businessName)}
        </div>

        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Automated Reminders</div>
        <div style="margin-bottom: 32px;">
          ${renderReminderPreview(businessName)}
        </div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 32px;">
        There's no complicated setup and you can start seeing results immediately. Many service businesses use this to improve customer convenience and capture bookings they would normally lose outside business hours.
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

export function registerSeoRoutes(app: Application): void {
  initTools({ headTags, breadcrumbs, wrapPage, utmLink, BRAND, DOMAIN });

  app.get("/internal/outreach", (req: Request, res: Response) => {
    res.send(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Outreach | ${BRAND}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background: #000; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
        input, select { background: #111 !important; border: 1px solid #222 !important; color: #fff !important; }
        input:focus, select:focus { border-color: #444 !important; outline: none; }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <div class="mb-10 text-center">
          <img src="/favicon.png" class="w-12 h-12 mx-auto mb-4">
          <h1 class="text-3xl font-semibold tracking-tight">Outreach</h1>
          <p class="text-gray-500 text-sm mt-2">Generate and send premium booking previews</p>
        </div>
        
        <form id="f" class="space-y-4">
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Recipient Email</label>
            <input id="t" type="email" placeholder="client@example.com" required class="w-full p-4 rounded-2xl text-base">
          </div>
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Business Name</label>
              <input id="b" placeholder="Luxury Auto Spa" required class="w-full p-4 rounded-2xl text-base">
            </div>
            <div>
              <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Business Slug</label>
              <input id="s" placeholder="luxury-auto-spa" required class="w-full p-4 rounded-2xl text-base text-gray-400">
            </div>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Industry Niche</label>
            <select id="n" class="w-full p-4 rounded-2xl text-base appearance-none bg-no-repeat bg-right">
              <option value="auto-detailing">Auto Detailing</option>
              <option value="salon">Hair Salon</option>
              <option value="barbershop">Barbershop</option>
              <option value="fitness">Fitness / Gym</option>
              <option value="spa">Spa / Wellness</option>
              <option value="tattoo">Tattoo Studio</option>
              <option value="massage">Massage Therapy</option>
            </select>
          </div>

          <button class="w-full py-5 mt-4 rounded-2xl bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl">
            Send Booking Preview
          </button>
        </form>
        
        <div id="m" class="mt-8 text-center font-medium min-h-[24px]"></div>
      </div>

      <script>
        const nameInput = document.getElementById('b');
        const slugInput = document.getElementById('s');
        nameInput.oninput = () => {
          slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        };
        document.getElementById('f').onsubmit=async(e)=>{
          e.preventDefault();
          const btn = e.target.querySelector('button');
          const m=document.getElementById('m');
          btn.disabled = true;
          btn.style.opacity = '0.5';
          m.innerText='Sending premium outreach...';
          m.className='mt-8 text-center font-medium text-white animate-pulse';
          
          try {
            const r=await fetch('/api/internal/send-outreach',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                to:document.getElementById('t').value,
                businessName:document.getElementById('b').value,
                slug:document.getElementById('s').value,
                niche:document.getElementById('n').value
              })
            });
            if(r.ok){
              m.innerText='Email sent successfully!';
              m.className='mt-8 text-center font-medium text-green-400';
              e.target.reset();
            }else{
              const t=await r.text();
              m.innerText='Error: '+t;
              m.className='mt-8 text-center font-medium text-red-400';
            }
          } catch(err) {
            m.innerText='Connection error';
            m.className='mt-8 text-center font-medium text-red-400';
          } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        }
      </script>
    </body></html>`);
  });

  app.post("/api/internal/send-outreach", async (req: Request, res: Response) => {
    const { to, businessName, slug, niche } = req.body;
    if (!to || !businessName || !slug) return res.status(400).send("Missing fields");
    
    try {
      const client = new Postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
      const emailHtml = await getEmailTemplate(businessName, `https://confirmbooking.online/book/${slug}`, niche);
      await client.sendEmail({
        From: "hello@confirmbooking.online",
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

  app.get("/book/:slug", (req: Request, res: Response) => {
    const { slug } = req.params;
    const niche = (req.query.niche as string) || "auto-detailing";
    const businessName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    res.send(`<!DOCTYPE html><html><head>
      ${headTags(`Book Appointment | ${businessName}`, `Book your next service with ${businessName} online.`, `${DOMAIN}/book/${slug}`, "")}
      <style>
        .demo-badge { background: #f5f5f7; color: #000; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body class="bg-black text-white p-8">
      <div class="max-w-md mx-auto">
        <div class="flex justify-between items-center mb-8">
          <h1 class="font-heading text-3xl">${businessName}</h1>
          <span class="demo-badge">DEMO PREVIEW</span>
        </div>
        <div class="glass-card rounded-3xl p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">Select Service</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center p-4 border border-white/10 rounded-2xl">
              <div>
                <div class="font-medium">Standard Service</div>
                <div class="text-silver text-sm">45 mins - $80</div>
              </div>
              <button class="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">Book</button>
            </div>
            <div class="flex justify-between items-center p-4 border border-white/10 rounded-2xl">
              <div>
                <div class="font-medium">Premium Package</div>
                <div class="text-silver text-sm">90 mins - $150</div>
              </div>
              <button class="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">Book</button>
            </div>
          </div>
        </div>
        <p class="text-center text-silver text-xs">Powered by BookFlow - Smart Booking Infrastructure</p>
      </div>
    </body></html>`);
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
