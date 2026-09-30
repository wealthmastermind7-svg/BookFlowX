import type { Application, Request, Response } from "express";
import { initTools, TOOLS_LIST } from "./seo-tools";
import Postmark from "postmark";
import QRCode from "qrcode";

const DOMAIN = "https://confirmbooking.online";
const BRAND = "BookFlow";
const TAGLINE = "Smart Booking for Property Professionals";
const DOWNLOAD_LINK = "https://confirmbooking.online";

function renderConfirmationPreview(businessName: string, niche: string = "real-estate-agents"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, string> = {
    "real-estate-agents": "Property Viewing",
    "property-managers": "Rental Inspection",
    "landlords": "Rental Inspection",
    "rental-agencies": "Open Home",
    "commercial-property": "Property Viewing",
    "buyers-agents": "Property Viewing",
    "strata-managers": "Rental Inspection",
    "building-managers": "Rental Inspection",
  };
  const service = services[niche] || services["real-estate-agents"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; font-family: 'Inter', sans-serif;">${upperName}</div>
        <div style="font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">VIEWING CONFIRMED</div>
        <div style="color: #888; font-size: 14px; font-family: 'Inter', sans-serif;">Your property appointment is booked</div>
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
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">VIEWING TYPE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service}</td>
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
              <td colspan="2" style="color: #00d4ff; font-size: 15px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Viewing Confirmed</td>
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

function renderReminderPreview(businessName: string, niche: string = "real-estate-agents"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, string> = {
    "real-estate-agents": "Property Viewing",
    "property-managers": "Rental Inspection",
    "landlords": "Rental Inspection",
    "rental-agencies": "Open Home",
    "commercial-property": "Property Viewing",
    "buyers-agents": "Property Viewing",
    "strata-managers": "Rental Inspection",
    "building-managers": "Rental Inspection",
  };
  const service = services[niche] || services["real-estate-agents"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; font-family: 'Inter', sans-serif;">${upperName}</div>
        <div style="font-family: 'Inter', sans-serif; font-size: 42px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">REMINDER</div>
        <div style="color: #888; font-size: 14px; font-family: 'Inter', sans-serif;">Your property viewing is coming up soon</div>
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
              <td style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 0; font-family: 'Inter', sans-serif; vertical-align: top;">VIEWING TYPE</td>
              <td style="color: #f5f5f7; font-size: 16px; font-weight: 700; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">${service}</td>
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
              <td colspan="2" style="color: #00d4ff; font-size: 15px; font-weight: 800; text-align: right; padding: 8px 0; font-family: 'Inter', sans-serif;">Viewing Reminder</td>
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

function getEmailTemplate(businessName: string, bookingLink: string, slug: string, niche: string = "real-estate-agents"): string {
  const qrImageUrl = `${DOMAIN}/api/qr/${encodeURIComponent(slug)}`;

  return `
    <div style="background-color: #000; color: #f5f5f7; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="margin-bottom: 32px; text-align: center;">
        <img src="${DOMAIN}/favicon.png" style="width: 48px; height: 48px; margin-bottom: 16px;">
        <h1 style="color: #f5f5f7; font-size: 32px; margin: 8px 0; font-family: 'Cormorant Garamond', serif;">Property Viewing Bookings for ${businessName}</h1>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">Hi there,</p>
      
      <p style="font-size: 18px; line-height: 1.6; color: #f5f5f7; margin-bottom: 24px; font-weight: 600;">
        How many property viewings is ${businessName} missing each week?
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 16px;">
        Property professionals lose viewing opportunities when:
      </p>

      <ul style="color: #ccc; padding-left: 20px; margin-bottom: 16px; line-height: 2;">
        <li>Viewing requests arrive after hours and go unanswered</li>
        <li>Tenants miss scheduled viewings or inspections</li>
        <li>Scheduling by email and phone takes too much back-and-forth</li>
        <li>There are no automated reminders before inspections</li>
      </ul>

      <p style="font-size: 16px; line-height: 1.6; color: #f5f5f7; margin-bottom: 24px; font-weight: 600;">
        Buyers and tenants move on when they cannot book a viewing easily.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 16px;">
        Here is a property booking link and QR code for <strong>${businessName}</strong>. It helps you:
      </p>

      <ul style="color: #ccc; padding-left: 20px; margin-bottom: 24px; line-height: 2;">
        <li>Accept viewing requests instantly from listing pages</li>
        <li>Reduce no-shows with automated SMS confirmations and inspection reminders</li>
        <li>Answer property enquiries 24/7 with AI voice and book viewings</li>
        <li>Put QR codes on for-lease signs so tenants can book on the spot</li>
      </ul>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">
        Share the booking link from your listings or display the QR code on a for-lease sign.
      </p>

      <div style="margin-bottom: 40px;">
        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Your Property Viewing Link</div>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: #111; padding: 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; line-height: 1; margin: 0; color: #f5f5f7; letter-spacing: -1px;">BOOK A<br>PROPERTY<br>VIEWING</h2>
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
                <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">BOOK A PROPERTY VIEWING</div>
                <div style="color: #444; font-size: 12px;">CONFIRMBOOKING.ONLINE</div>
              </td>
              <td style="width: 36px; vertical-align: middle; text-align: right;">
                <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 32px; color: #f5f5f7; font-size: 16px;">↗</div>
              </td>
            </tr></table>
          </div>
        </div>
        
        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">QR Code for For-Lease Signs</div>
        <div style="background: #111; padding: 40px; border-radius: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px;">
          <div style="background: #fff; padding: 24px; border-radius: 24px; display: inline-block;">
            <img src="${qrImageUrl}" alt="QR Code for ${businessName}" style="width: 200px; height: 200px; display: block;">
          </div>
          <div style="margin-top: 24px;">
            <div style="color: #f5f5f7; font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">${businessName}</div>
            <div style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px;">SCAN TO BOOK A VIEWING</div>
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

      <p style="font-size: 18px; line-height: 1.6; color: #f5f5f7; margin-bottom: 12px; font-weight: 600; text-align: center;">
        Capture viewing requests even when you're at another showing.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #888; margin-bottom: 32px; text-align: center;">
        Keep viewing enquiries, confirmations, and reminders in one place.
      </p>

      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 32px; margin-bottom: 32px;">
        <p style="color: #ccc; font-size: 14px; margin-bottom: 24px;">Here's your live demo:</p>
        <a href="${bookingLink}" style="background: #f5f5f7; color: #000; padding: 18px 48px; border-radius: 100px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px;">View ${businessName} Viewing Page</a>
      </div>

      <p style="font-size: 16px; color: #ccc; line-height: 1.6;">
        Would you like to start capturing property viewing requests right away?
      </p>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #f5f5f7; font-weight: 600; margin-bottom: 4px;">BookFlow</p>
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${TAGLINE}</p>
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
              'pure-black': '#0a0a0f',
              'charcoal': '#0d0d1a',
              'graphite': '#111827',
              'smoke': '#52627a',
              'silver': '#94a3b8',
              'pearl': '#f8fafc',
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
        color-scheme: dark;
        --pure-black: #0a0a0f;
        --charcoal: #0d0d1a;
        --graphite: #111827;
        --smoke: #52627a;
        --silver: #94a3b8;
        --pearl: #f8fafc;
        --cyan: #00d4ff;
        --violet: #7c3aed;
      }
      body {
        background:
          radial-gradient(ellipse at 84% 0%, rgba(124,58,237,.13), transparent 35%),
          radial-gradient(ellipse at 10% 56%, rgba(0,212,255,.07), transparent 31%),
          var(--pure-black) !important;
        color: var(--pearl);
        font-family: 'Inter', sans-serif;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
      }
      nav[aria-label="Breadcrumb"] { color:var(--silver); }
      nav[aria-label="Breadcrumb"] a:hover { color:var(--cyan); }
      body > nav:not([aria-label="Breadcrumb"]) {
        background:rgba(10,10,15,.82) !important;
        border-color:rgba(0,212,255,.16) !important;
        backdrop-filter:blur(20px);
      }
      body > nav:not([aria-label="Breadcrumb"]) img { box-shadow:0 0 24px rgba(0,212,255,.12); }
      body > nav:not([aria-label="Breadcrumb"]) .font-heading { font-family:'Inter',sans-serif; }
      body > nav:not([aria-label="Breadcrumb"]) a:not(.cta-btn):hover { color:var(--cyan) !important; }
      main { min-height:55vh; }
      main > section:first-child {
        background:
          radial-gradient(ellipse at 52% 42%,rgba(124,58,237,.16),transparent 35%),
          radial-gradient(ellipse at 74% 75%,rgba(0,212,255,.11),transparent 35%),
          linear-gradient(145deg,#0a0a0f,#0d0d1a 58%,#111827) !important;
      }
      main > section:first-child > div:first-child { display:none; }
      main h1 {
        color:#f8fafc;
        font-family:'Inter',sans-serif;
        font-weight:800;
        letter-spacing:-.065em;
        line-height:.98;
        background:linear-gradient(100deg,#fff 3%,#00d4ff 58%,#a78bfa 100%);
        -webkit-background-clip:text;
        background-clip:text;
      }
      main h1 span { color:#00d4ff !important; }
      main h2, main h3 { font-family:'Inter',sans-serif; letter-spacing:-.035em; }
      main p { color:#94a3b8; }
      main > div.max-w-7xl, main > div.max-w-4xl {
        position:relative;
        isolation:isolate;
      }
      main > div.max-w-7xl::before, main > div.max-w-4xl::before {
        content:"";
        position:absolute;
        z-index:-1;
        inset:3rem -2rem auto;
        height:220px;
        border-radius:50%;
        background:radial-gradient(ellipse,rgba(0,212,255,.08),transparent 68%);
        pointer-events:none;
      }
      .glass-card {
        background:linear-gradient(145deg,rgba(26,26,46,.9),rgba(22,33,62,.72)) !important;
        border:1px solid rgba(0,212,255,.17) !important;
        box-shadow:0 14px 44px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.035);
        transition:transform .32s ease,border-color .32s ease,box-shadow .32s ease,background .32s ease;
        color:#f8fafc;
      }
      .glass-card:hover {
        background:linear-gradient(145deg,rgba(26,26,46,.98),rgba(22,33,62,.9)) !important;
        border-color:rgba(0,212,255,.48) !important;
        transform:translateY(-3px);
        box-shadow:0 18px 48px rgba(0,212,255,.08);
      }
      .cta-btn {
        display: inline-block;
        background:linear-gradient(110deg,#00d4ff,#85edff);
        color:#06121c;
        padding: 16px 40px;
        border-radius: 100px;
        font-weight: 600;
        text-decoration: none;
        letter-spacing: 0.5px;
        border:1px solid rgba(159,242,255,.55);
        box-shadow:0 8px 30px rgba(0,212,255,.16);
        transition:transform .3s ease,box-shadow .3s ease,filter .3s ease;
      }
      .cta-btn:hover {
        transform:translateY(-2px);
        box-shadow:0 12px 36px rgba(0,212,255,.32);
        filter:saturate(1.1);
      }
      .cta-btn-outline {
        display: inline-block;
        border: 1px solid rgba(0,212,255,.34);
        color: #eaf7ff;
        padding: 14px 36px;
        border-radius: 100px;
        font-weight: 500;
        text-decoration: none;
        background:rgba(17,24,39,.62);
        transition:transform .3s ease,border-color .3s ease,background .3s ease;
      }
      .cta-btn-outline:hover {
        background:rgba(0,212,255,.1);
        color:#fff;
        border-color:#00d4ff;
        transform:translateY(-2px);
      }
      .text-silver { color:#94a3b8 !important; }
      .text-smoke { color:#64748b !important; }
      footer { background:rgba(8,8,13,.8); border-color:rgba(0,212,255,.14) !important; }
      footer a:hover { color:#00d4ff !important; }
      @media(max-width:640px) {
        main > div.max-w-7xl, main > div.max-w-4xl { padding-top:2rem; }
        main h1 { font-size:clamp(2.65rem,13vw,4rem); }
        .cta-btn,.cta-btn-outline { padding:13px 22px; }
      }
      @media(prefers-reduced-motion:reduce) {
        *,*::before,*::after { scroll-behavior:auto !important; animation-duration:.01ms !important; transition-duration:.01ms !important; }
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
        <p class="text-silver text-sm leading-relaxed">${TAGLINE}. Keep viewings, inspections, and tenant appointments organized in one place.</p>
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
        <p class="text-smoke text-xs mt-2 md:mt-0">Powering property viewings and inspections worldwide.</p>
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
    `${BRAND} helps real estate agents and property managers automate viewings, inspections and tenant appointments with AI voice, SMS and email in one place.`,
    DOMAIN,
    "property viewing booking software, real estate scheduling, rental inspection booking, tenant appointments, AI voice, SMS confirmations"
  );

  const body = `
  <section class="relative min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-24 overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-pure-black to-pure-black"></div>
    <div class="relative z-10 max-w-5xl mx-auto text-center">
      <p class="text-[#00d4ff] text-xs sm:text-sm uppercase tracking-[0.25em] mb-6 font-bold">Smart booking for property professionals</p>
      <h1 class="font-sans text-5xl sm:text-7xl lg:text-8xl font-extrabold mb-8 leading-[0.95] tracking-tight">
        Never Miss a Property<br>
        <span class="text-[#00d4ff]">Viewing Again</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
        BookFlow helps real estate agents and property managers automate viewings, inspections, and tenant appointments — with AI voice, SMS, and email all in one place.
      </p>
      <div class="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10" aria-label="Booking channels">
        <span class="glass-card rounded-full px-4 py-2 text-sm font-semibold">🏠 Viewing Bookings</span>
        <span class="glass-card rounded-full px-4 py-2 text-sm font-semibold">📱 SMS Confirmations</span>
        <span class="glass-card rounded-full px-4 py-2 text-sm font-semibold">📞 Voice AI</span>
        <span class="glass-card rounded-full px-4 py-2 text-sm font-semibold">📧 Automated Reminders</span>
      </div>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="${utmLink("seo", "organic", "homepage-hero")}" class="cta-btn text-base">Start Booking Viewings Free</a>
        <a href="/booking-software" class="cta-btn-outline text-base">Explore Property Roles</a>
      </div>
      <p class="text-silver text-sm mt-10">Built for real estate agents, property managers, and landlords.</p>
    </div>
  </section>
  <section class="px-4 sm:px-6 py-20 sm:py-28 bg-[#0d0d1a] border-y border-[#00d4ff]/10" aria-labelledby="omnichannel-heading">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <p class="text-[#00d4ff] text-xs font-bold uppercase tracking-[0.25em] mb-4">Every property enquiry can become a viewing</p>
        <h2 id="omnichannel-heading" class="font-sans text-4xl sm:text-6xl font-extrabold text-pearl mb-5">Meet Customers Where They Are</h2>
        <p class="text-silver text-lg max-w-2xl mx-auto">Manage viewing requests across the channels tenants and buyers already use.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="glass-card rounded-2xl p-7">
          <span class="text-3xl block mb-6" aria-hidden="true">📱</span>
          <h3 class="text-pearl text-xl font-bold mb-3">SMS</h3>
          <p class="text-silver leading-relaxed">Instant viewing confirmations &amp; inspection reminders sent directly to tenants and buyers.</p>
        </div>
        <div class="glass-card rounded-2xl p-7">
          <span class="text-3xl block mb-6" aria-hidden="true">📞</span>
          <h3 class="text-pearl text-xl font-bold mb-3">Voice AI</h3>
          <p class="text-silver leading-relaxed">AI answers property enquiries and books viewings 24/7 — even when you're at another showing.</p>
        </div>
        <div class="glass-card rounded-2xl p-7">
          <span class="text-3xl block mb-6" aria-hidden="true">📧</span>
          <h3 class="text-pearl text-xl font-bold mb-3">Email</h3>
          <p class="text-silver leading-relaxed">Automated follow-ups, viewing confirmations, and move-in reminders delivered to the inbox.</p>
        </div>
        <div class="glass-card rounded-2xl p-7">
          <span class="text-3xl block mb-6" aria-hidden="true">💬</span>
          <h3 class="text-pearl text-xl font-bold mb-3">Chat</h3>
          <p class="text-silver leading-relaxed">Website chat widget that books property viewings directly from your listings page.</p>
        </div>
      </div>
    </div>
  </section>`;

  return wrapPage(head, body);
}

function comparisonPage(competitor: string): string {
  const compName = formatCompetitorName(competitor);
  const title = `${BRAND} vs ${compName} | Property Viewing Booking Software`;
  const description = `Comparing ${BRAND} vs ${compName}? Explore booking software for property viewings and inspections.`;
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
  const head = headTags(`Booking Software for Property Professionals | ${BRAND}`, "", `${DOMAIN}/booking-software`, "");
  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="font-heading text-5xl font-semibold mb-8">Booking Software for Property Professionals</h1>
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
      :root { color-scheme:dark; --ink:#0a0a0f; --deep:#0d0d1a; --panel:#111827; --card:#1a1a2e; --cyan:#00d4ff; --violet:#7c3aed; --copy:#94a3b8; }
      body {
        background:
          radial-gradient(ellipse at 78% 0%,rgba(124,58,237,.16),transparent 34%),
          radial-gradient(ellipse at 8% 45%,rgba(0,212,255,.09),transparent 30%),
          var(--ink);
        color:#f8fafc;
        font-family:'Inter',sans-serif;
        -webkit-font-smoothing:antialiased;
      }
      input,select,textarea {
        background:rgba(17,24,39,.9) !important;
        border:1px solid rgba(148,163,184,.2) !important;
        color:#f8fafc !important;
        transition:border-color .2s ease,box-shadow .2s ease;
      }
      input::placeholder,textarea::placeholder { color:#52627a; }
      input:focus,select:focus,textarea:focus { border-color:var(--cyan) !important; outline:none; box-shadow:0 0 0 3px rgba(0,212,255,.1); }
      .tab-active { background:linear-gradient(110deg,#00d4ff,#85edff); color:#06121c; box-shadow:0 6px 24px rgba(0,212,255,.16); }
      .tab-inactive { background:rgba(17,24,39,.62); color:#94a3b8; border:1px solid rgba(148,163,184,.18); }
      .tab-inactive:hover { color:#fff; border-color:rgba(0,212,255,.42); }
      .lead-row:hover { background:rgba(0,212,255,.06); }
      .lead-row.sent { opacity: 0.4; }
      .progress-bar { transition: width 0.3s ease; }
      body > div { max-width:100%; }
      body > div > div:first-child { border:1px solid rgba(0,212,255,.12); border-radius:24px; padding:24px; background:rgba(17,24,39,.42); box-shadow:0 18px 54px rgba(0,0,0,.2); }
      button:not(.tab-inactive) { transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease; }
      button.bg-white,button[type="submit"] { background:linear-gradient(110deg,#00d4ff,#85edff) !important; color:#06121c !important; box-shadow:0 8px 28px rgba(0,212,255,.15); }
      button.bg-white:hover,button[type="submit"]:hover { box-shadow:0 12px 32px rgba(0,212,255,.26); }
      [class*="border-gray-800"],[class*="border-gray-700"] { border-color:rgba(0,212,255,.14) !important; }
      [class*="bg-gray-800"] { background-color:#111827 !important; }
      [class*="text-gray-500"],[class*="text-gray-600"] { color:#71839a !important; }
      [class*="text-gray-400"] { color:#94a3b8 !important; }
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
        <button onclick="switchTab('kimi')" id="tab-kimi" class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all tab-inactive">Kimi Claw</button>
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
            <input id="single-name" placeholder="Harbour Property Group" required class="w-full p-4 rounded-2xl text-base">
          </div>
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Business Slug</label>
            <input id="single-slug" placeholder="harbour-property-group" required class="w-full p-4 rounded-2xl text-base text-gray-400">
          </div>
          <div>
            <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Industry Niche</label>
            <select id="single-niche" class="w-full p-4 rounded-2xl text-base">
              <option value="real-estate-agents">Real Estate Agents</option>
              <option value="property-managers">Property Managers</option>
              <option value="rental-agencies">Rental Agencies</option>
              <option value="landlords">Landlords / Investors</option>
              <option value="buyers-agents">Buyers Agents</option>
              <option value="strata-managers">Strata / Body Corporate</option>
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
 | Harbour Property Group | hello@example.com | (02) 5550 0101 | Sydney, NSW |
..." class="w-full p-4 rounded-2xl text-sm font-mono leading-relaxed resize-none"></textarea>
            <div class="flex gap-3 mt-3">
              <div class="flex-1">
                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Niche for All</label>
                <select id="bulk-niche" class="w-full p-3 rounded-xl text-sm">
                  <option value="real-estate-agents">Real Estate Agents</option>
                  <option value="property-managers">Property Managers</option>
                  <option value="rental-agencies">Rental Agencies</option>
                  <option value="landlords">Landlords / Investors</option>
                  <option value="buyers-agents">Buyers Agents</option>
                  <option value="strata-managers">Strata / Body Corporate</option>
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

      <!-- KIMI CLAW TAB -->
      <div id="panel-kimi" class="panel hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Industry Niche</label>
                <select id="kimi-niche" class="w-full p-4 rounded-2xl text-base">
                  <option value="real-estate-agents">Real Estate Agents</option>
                  <option value="property-managers">Property Managers</option>
                  <option value="rental-agencies">Rental Agencies</option>
                  <option value="landlords">Landlords / Investors</option>
                  <option value="buyers-agents">Buyers Agents</option>
                  <option value="strata-managers">Strata / Body Corporate</option>
                </select>
              </div>
              <div>
                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">City</label>
                <input id="kimi-city" placeholder="Auckland, New Zealand" class="w-full p-4 rounded-2xl text-base">
              </div>
              <button onclick="kimiProspect()" id="kimi-prospect-btn" class="w-full py-5 mt-4 rounded-2xl bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl">
                Find Leads with Kimi Claw
              </button>
              <div class="border-t border-gray-800 pt-4 mt-4">
                <button onclick="kimiAutoOutreach()" id="kimi-auto-btn" class="w-full py-4 rounded-2xl bg-transparent text-white font-bold text-base border border-gray-700 hover:border-gray-500 transition-colors">
                  Run Auto Outreach (Next Rotation)
                </button>
                <p class="text-xs text-gray-600 mt-2 text-center">Kimi picks the next niche/city combo, prospects 20 leads, and sends all emails automatically.</p>
              </div>
            </div>
            <div id="kimi-status" class="mt-6 min-h-[24px]"></div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-xs uppercase tracking-widest text-gray-500 ml-1">Prospected Leads (<span id="kimi-lead-count">0</span>)</label>
              <button onclick="kimiSendAll()" id="kimi-send-all-btn" class="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform hidden">Send All via Postmark</button>
            </div>
            <div id="kimi-leads-list" class="border border-gray-800 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
              <div class="p-8 text-center text-gray-600 text-sm">Kimi Claw will find Gmail leads here</div>
            </div>
            <div id="kimi-send-progress" class="mt-4 hidden">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
                <span id="kimi-send-progress-text" class="text-sm text-gray-400">Sending...</span>
              </div>
              <div class="w-full bg-gray-800 rounded-full h-2">
                <div id="kimi-send-progress-bar" class="bg-white h-2 rounded-full progress-bar" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 border border-gray-800 rounded-2xl">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2 h-2 rounded-full bg-blue-400"></div>
            <span class="text-xs uppercase tracking-widest text-gray-500">Daily Cron Status</span>
          </div>
          <p class="text-sm text-gray-400">Kimi Claw runs automatically every day at <strong class="text-white">9:00 AM</strong>, finding 5 leads and sending outreach emails via Postmark.</p>
          <div id="kimi-stats" class="mt-3 text-xs text-gray-600"></div>
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

      let kimiLeads = [];

      async function kimiProspect() {
        const niche = document.getElementById('kimi-niche').value;
        const city = document.getElementById('kimi-city').value;
        if (!city) { document.getElementById('kimi-status').innerHTML = '<div class="text-red-400 text-sm">Enter a city</div>'; return; }

        const btn = document.getElementById('kimi-prospect-btn');
        const status = document.getElementById('kimi-status');
        btn.disabled = true; btn.style.opacity = '0.5';
        btn.textContent = 'Kimi Claw is researching...';
        status.innerHTML = '<div class="flex items-center gap-2 text-sm text-gray-400"><div class="w-2 h-2 rounded-full bg-blue-400 pulse-dot"></div>Finding Gmail leads with Kimi K2.5...</div>';

        try {
          const r = await fetch('/api/internal/kimi-prospect', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ niche, city })
          });

          if (!r.ok) {
            const err = await r.json();
            status.innerHTML = '<div class="text-red-400 text-sm">' + (err.error || 'Failed') + '</div>';
            btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Find Leads with Kimi Claw';
            return;
          }

          const data = await r.json();
          kimiLeads = data.leads || [];
          renderKimiLeads();
          status.innerHTML = '<div class="text-green-400 text-sm">Found ' + kimiLeads.length + ' verified Gmail leads (invalid addresses filtered out)</div>';
          btn.textContent = 'Find More Leads';
          btn.disabled = false; btn.style.opacity = '1';
        } catch(err) {
          status.innerHTML = '<div class="text-red-400 text-sm">Connection error</div>';
          btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Find Leads with Kimi Claw';
        }
      }

      function renderKimiLeads() {
        const container = document.getElementById('kimi-leads-list');
        document.getElementById('kimi-lead-count').textContent = kimiLeads.length;
        document.getElementById('kimi-send-all-btn').classList.toggle('hidden', kimiLeads.length === 0);

        if (kimiLeads.length === 0) {
          container.innerHTML = '<div class="p-8 text-center text-gray-600 text-sm">No leads found</div>';
          return;
        }

        let html = '<table class="w-full text-xs"><thead><tr class="border-b border-gray-800 text-gray-500 uppercase tracking-widest">';
        html += '<th class="p-3 text-left">Business</th><th class="p-3 text-left">Email</th><th class="p-3 text-left">Signal</th><th class="p-3 text-left w-20">Action</th></tr></thead><tbody>';

        kimiLeads.forEach((lead, i) => {
          const isSent = lead._sent;
          html += '<tr class="lead-row border-b border-gray-800/50 ' + (isSent ? 'sent' : '') + '">';
          html += '<td class="p-3"><div class="font-medium text-white">' + lead.businessName + '</div><div class="text-gray-600 mt-0.5">' + lead.city + '</div></td>';
          html += '<td class="p-3 text-gray-400">' + lead.email + '</td>';
          html += '<td class="p-3"><span class="text-yellow-500/70">' + (lead.conversionSignal || '-') + '</span></td>';
          html += '<td class="p-3">' + (isSent ? '<span class="text-green-500">Sent</span>' : '<button onclick="kimiSendOne(' + i + ')" class="text-xs px-3 py-1 rounded-lg bg-white text-black font-bold hover:scale-105 transition-transform">Send</button>') + '</td>';
          html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
      }

      async function kimiSendOne(idx) {
        const lead = kimiLeads[idx];
        if (!lead || lead._sent) return;

        try {
          const r = await fetch('/api/internal/send-outreach', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ to: lead.email, businessName: lead.businessName, slug: lead.slug, niche: lead.niche })
          });
          if (r.ok) {
            lead._sent = true;
            addToHistory(lead.email, lead.businessName, lead.niche);
            renderKimiLeads();
          }
        } catch {}
      }

      async function kimiSendAll() {
        const toSend = kimiLeads.filter(l => !l._sent);
        if (toSend.length === 0) return;

        const progress = document.getElementById('kimi-send-progress');
        const bar = document.getElementById('kimi-send-progress-bar');
        const text = document.getElementById('kimi-send-progress-text');
        progress.classList.remove('hidden');

        let sent = 0, failed = 0;
        for (const lead of toSend) {
          text.textContent = 'Sending to ' + lead.businessName + '... (' + (sent + failed + 1) + '/' + toSend.length + ')';
          bar.style.width = ((sent + failed) / toSend.length * 100) + '%';

          try {
            const r = await fetch('/api/internal/send-outreach', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ to: lead.email, businessName: lead.businessName, slug: lead.slug, niche: lead.niche })
            });
            if (r.ok) { lead._sent = true; sent++; addToHistory(lead.email, lead.businessName, lead.niche); }
            else { failed++; }
          } catch { failed++; }

          renderKimiLeads();
          if (sent + failed < toSend.length) await new Promise(r => setTimeout(r, 1500));
        }

        bar.style.width = '100%';
        text.textContent = sent + ' sent' + (failed > 0 ? ', ' + failed + ' failed' : '') + ' — complete!';
        setTimeout(() => progress.classList.add('hidden'), 5000);
      }

      async function kimiAutoOutreach() {
        const btn = document.getElementById('kimi-auto-btn');
        const status = document.getElementById('kimi-status');
        btn.disabled = true; btn.style.opacity = '0.5';
        btn.textContent = 'Running...';
        status.innerHTML = '<div class="flex items-center gap-2 text-sm text-gray-400"><div class="w-2 h-2 rounded-full bg-blue-400 pulse-dot"></div>Kimi Claw prospecting, verifying emails via SMTP, then sending...</div>';

        try {
          const r = await fetch('/api/internal/kimi-outreach', { method: 'POST' });
          const data = await r.json();
          if (data.leads && data.leads.length > 0) {
            kimiLeads = data.leads;
            renderKimiLeads();
          }
          status.innerHTML = '<div class="text-green-400 text-sm">Done! Sent ' + data.sent + ' verified emails (' + data.niche + ' in ' + data.city + ')' + (data.failed > 0 ? ', ' + data.failed + ' failed' : '') + '</div>';
        } catch {
          status.innerHTML = '<div class="text-red-400 text-sm">Outreach failed</div>';
        }
        btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Run Auto Outreach (Next Rotation)';
        loadOutreachStats();
      }

      async function loadOutreachStats() {
        try {
          const r = await fetch('/api/internal/outreach-stats');
          const data = await r.json();
          document.getElementById('kimi-stats').innerHTML =
            '<div class="grid grid-cols-2 gap-2 mt-2">' +
            '<div>Emails sent: <span class="text-white font-bold">' + data.totalSent + '</span></div>' +
            '<div>Combos used: <span class="text-white font-bold">' + data.usedCombos + '</span> / ' + data.totalCombos + '</div>' +
            '<div>Locations: <span class="text-white">' + data.totalLocations + '</span> (US + Intl)</div>' +
            '<div>Niches: <span class="text-white">' + data.totalNiches + '</span></div>' +
            '</div>' +
            '<div class="mt-2">Next target: <span class="text-white font-bold">' + data.nextCombo.niche + '</span> in <span class="text-white font-bold">' + data.nextCombo.city + '</span></div>';
        } catch {}
      }
      loadOutreachStats();

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
        Subject: `How many property viewings is ${businessName} missing each week?`,
        HtmlBody: emailHtml,
        MessageStream: "outbound"
      });
      res.sendStatus(200);
    } catch (e: any) { 
      console.error("Outreach Error:", e);
      res.status(500).send(e.message); 
    }
  });

  app.post("/api/internal/kimi-prospect", async (req: Request, res: Response) => {
    const { niche, city } = req.body;
    if (!niche || !city) return res.status(400).json({ error: "Missing niche or city" });

    try {
      const { runKimiProspecting } = await import("./outreachCron");
      const leads = await runKimiProspecting(niche, city);
      res.json({ leads, count: leads.length });
    } catch (e: any) {
      console.error("Kimi prospect error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/internal/kimi-outreach", async (req: Request, res: Response) => {
    try {
      const { runDailyOutreach } = await import("./outreachCron");
      const result = await runDailyOutreach();
      res.json(result);
    } catch (e: any) {
      console.error("Kimi outreach error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/internal/outreach-stats", async (_req: Request, res: Response) => {
    try {
      const { getOutreachStats } = await import("./outreachCron");
      res.json(getOutreachStats());
    } catch (e: any) {
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

const INDUSTRIES = ["real-estate-agents", "property-managers", "landlords", "rental-agencies", "commercial-property", "buyers-agents", "strata-managers", "building-managers"];
const COMPETITORS = ["calendly", "rex-software", "propertybase", "acuity", "landlordstudio"];
const LOCATIONS = ["auckland", "sydney", "melbourne", "brisbane", "london", "new-york", "los-angeles", "toronto", "dubai", "singapore"];
