import type { Application, Request, Response } from "express";
import * as postmark from 'postmark';

const BRAND = "BookFlow";
const DOMAIN = "https://confirmbooking.online";

const INDUSTRIES: Record<string, { name: string; services: { name: string; price: number; duration: string }[] }> = {
  "salon": { name: "Hair Salon", services: [
    { name: "Women's Haircut & Style", price: 65, duration: "45 min" },
    { name: "Color & Highlights", price: 120, duration: "90 min" },
    { name: "Blowout", price: 40, duration: "30 min" },
  ]},
  "barbershop": { name: "Barbershop", services: [
    { name: "Classic Haircut", price: 35, duration: "30 min" },
    { name: "Beard Trim & Shape", price: 20, duration: "15 min" },
    { name: "Hot Towel Shave", price: 40, duration: "30 min" },
  ]},
  "spa": { name: "Spa & Wellness", services: [
    { name: "Swedish Massage - 60 min", price: 95, duration: "60 min" },
    { name: "Deep Tissue Massage", price: 120, duration: "60 min" },
    { name: "Facial Treatment", price: 85, duration: "45 min" },
  ]},
  "auto-detailing": { name: "Auto Detailing", services: [
    { name: "Exterior Wash & Wax", price: 75, duration: "60 min" },
    { name: "Full Interior Detail", price: 150, duration: "120 min" },
    { name: "Ceramic Coating", price: 350, duration: "180 min" },
  ]},
  "fitness": { name: "Fitness Studio", services: [
    { name: "Personal Training Session", price: 70, duration: "60 min" },
    { name: "Group Class", price: 25, duration: "45 min" },
    { name: "Nutrition Consultation", price: 60, duration: "30 min" },
  ]},
  "dental": { name: "Dental Practice", services: [
    { name: "Dental Cleaning", price: 150, duration: "45 min" },
    { name: "Consultation & Exam", price: 80, duration: "30 min" },
    { name: "Teeth Whitening", price: 300, duration: "60 min" },
  ]},
  "medical": { name: "Medical Practice", services: [
    { name: "General Consultation", price: 120, duration: "30 min" },
    { name: "Follow-up Visit", price: 80, duration: "15 min" },
    { name: "Wellness Checkup", price: 200, duration: "45 min" },
  ]},
  "massage": { name: "Massage Therapy", services: [
    { name: "Therapeutic Massage", price: 90, duration: "60 min" },
    { name: "Sports Massage", price: 110, duration: "60 min" },
    { name: "Couples Massage", price: 170, duration: "60 min" },
  ]},
  "tattoo": { name: "Tattoo Studio", services: [
    { name: "Small Tattoo", price: 100, duration: "60 min" },
    { name: "Medium Tattoo", price: 250, duration: "120 min" },
    { name: "Consultation & Design", price: 50, duration: "30 min" },
  ]},
  "photography": { name: "Photography", services: [
    { name: "Portrait Session", price: 150, duration: "60 min" },
    { name: "Event Coverage - Half Day", price: 500, duration: "240 min" },
    { name: "Headshot Session", price: 100, duration: "30 min" },
  ]},
  "consulting": { name: "Consulting", services: [
    { name: "Strategy Session", price: 200, duration: "60 min" },
    { name: "Discovery Call", price: 0, duration: "30 min" },
    { name: "Workshop", price: 500, duration: "120 min" },
  ]},
  "coaching": { name: "Coaching", services: [
    { name: "1-on-1 Coaching", price: 150, duration: "60 min" },
    { name: "Goal Setting Session", price: 100, duration: "45 min" },
    { name: "Group Coaching", price: 50, duration: "60 min" },
  ]},
  "cleaning": { name: "Cleaning Service", services: [
    { name: "Standard Cleaning", price: 120, duration: "120 min" },
    { name: "Deep Cleaning", price: 250, duration: "240 min" },
    { name: "Move-In/Move-Out Clean", price: 300, duration: "300 min" },
  ]},
  "plumbing": { name: "Plumbing", services: [
    { name: "Service Call", price: 95, duration: "60 min" },
    { name: "Drain Cleaning", price: 150, duration: "45 min" },
    { name: "Water Heater Inspection", price: 80, duration: "30 min" },
  ]},
  "veterinary": { name: "Veterinary Clinic", services: [
    { name: "Wellness Exam", price: 65, duration: "30 min" },
    { name: "Vaccination Visit", price: 45, duration: "15 min" },
    { name: "Dental Cleaning", price: 300, duration: "60 min" },
  ]},
};

function outreachPage(): string {
  const industryOptions = Object.entries(INDUSTRIES)
    .map(([key, val]) => `<option value="${key}">${val.name}</option>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Outreach Tool | ${BRAND}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
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
    body { background-color: #000; color: #f5f5f7; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
    .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s ease; }
    .glass-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
    .email-preview-frame { background: #f5f5f5; border-radius: 16px; padding: 24px; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #222; color: #f5f5f7; padding: 16px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); z-index: 100; opacity: 0; transform: translateY(20px); transition: all 0.3s ease; font-size: 14px; pointer-events: none; }
    .toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .toast.error { border-color: #ff4444; }
    .toast.success { border-color: #44ff88; }
    
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #000; }
    ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #333; }
  </style>
</head>
<body>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-heading text-4xl sm:text-5xl font-semibold leading-tight">
          Cold Email<br><span class="text-silver">Outreach</span>
        </h1>
        <p class="text-silver text-sm mt-2">Private tool — generate and send personalized outreach emails</p>
      </div>
      <a href="/seo" class="text-silver text-sm hover:text-pearl transition-colors">&larr; Back to site</a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <!-- Input Form -->
      <div class="lg:col-span-2">
        <div class="glass-card rounded-2xl p-6 space-y-5 sticky top-8">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-heading text-2xl font-semibold">Business Details</h2>
            <button onclick="resetForm()" class="text-silver text-[10px] uppercase tracking-widest hover:text-pearl transition-colors">Reset</button>
          </div>
          
          <div>
            <label class="block text-pearl font-medium mb-1.5 text-xs uppercase tracking-wider" for="ownerName">Owner Name</label>
            <input type="text" id="ownerName" value="John" placeholder="John"
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-2.5 text-pearl text-sm focus:outline-none focus:border-pearl/30 transition-colors">
          </div>

          <div>
            <label class="block text-pearl font-medium mb-1.5 text-xs uppercase tracking-wider" for="businessName">Business Name</label>
            <input type="text" id="businessName" value="Elite Cuts" placeholder="Elite Cuts"
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-2.5 text-pearl text-sm focus:outline-none focus:border-pearl/30 transition-colors">
          </div>

          <div>
            <label class="block text-pearl font-medium mb-1.5 text-xs uppercase tracking-wider" for="industry">Industry</label>
            <select id="industry"
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-2.5 text-pearl text-sm focus:outline-none focus:border-pearl/30 transition-colors">
              ${industryOptions}
            </select>
          </div>

          <div>
            <label class="block text-pearl font-medium mb-1.5 text-xs uppercase tracking-wider" for="ownerEmail">Owner Email</label>
            <input type="email" id="ownerEmail" placeholder="owner@business.com"
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-2.5 text-pearl text-sm focus:outline-none focus:border-pearl/30 transition-colors">
          </div>

          <div>
            <label class="block text-pearl font-medium mb-1.5 text-xs uppercase tracking-wider" for="customMessage">Personal Message (optional)</label>
            <textarea id="customMessage" rows="3" placeholder="I noticed your business on Google and thought you'd love this..."
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-2.5 text-pearl text-sm focus:outline-none focus:border-pearl/30 transition-colors resize-none"></textarea>
          </div>

          <div class="pt-2 space-y-3">
            <button id="sendBtn" onclick="sendEmail()"
              class="w-full bg-pearl text-black font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] text-sm">
              Send via Email
            </button>
            <button id="copyBtn" onclick="copyHTML()"
              class="w-full border border-white/20 text-pearl font-medium py-3 rounded-xl transition-all hover:bg-white/5 active:scale-[0.98] text-sm">
              Copy Email HTML
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-3 pt-2">
             <button onclick="scrollToSection('preview-booking')" class="text-silver text-[10px] text-center border border-white/5 py-2 rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest">1. Booking</button>
             <button onclick="scrollToSection('preview-qr')" class="text-silver text-[10px] text-center border border-white/5 py-2 rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest">2. QR Code</button>
             <button onclick="scrollToSection('preview-confirmed')" class="text-silver text-[10px] text-center border border-white/5 py-2 rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest">3. Confirmed</button>
             <button onclick="scrollToSection('preview-reminder')" class="text-silver text-[10px] text-center border border-white/5 py-2 rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest">4. Reminder</button>
          </div>
        </div>
      </div>

      <!-- Live Email Preview -->
      <div class="lg:col-span-3">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-heading text-2xl font-semibold">Email Preview</h2>
          <span class="text-silver text-xs">Updates live as you type</span>
        </div>
        <div class="email-preview-frame">
          <div id="emailPreview"></div>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const INDUSTRIES = ${JSON.stringify(INDUSTRIES)};

    function showToast(msg, type) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type + ' show';
      setTimeout(() => { t.className = 'toast'; }, 3500);
    }

    function resetForm() {
      document.getElementById('ownerName').value = 'John';
      document.getElementById('businessName').value = 'Elite Cuts';
      document.getElementById('industry').value = 'salon';
      document.getElementById('ownerEmail').value = '';
      document.getElementById('customMessage').value = '';
      renderPreview();
      showToast('Form reset', 'success');
    }

    function scrollToSection(id) {
      const iframe = document.querySelector('#emailPreview iframe');
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const el = doc.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        const originalBg = el.style.background;
        el.style.boxShadow = '0 0 40px rgba(255,255,255,0.15)';
        setTimeout(() => { el.style.boxShadow = 'none'; }, 2000);
      }
    }

    function getInputs() {
      return {
        ownerName: document.getElementById('ownerName').value || 'there',
        businessName: document.getElementById('businessName').value || 'Your Business',
        industry: document.getElementById('industry').value,
        ownerEmail: document.getElementById('ownerEmail').value,
        customMessage: document.getElementById('customMessage').value,
      };
    }

    function generateEmailHTML(inputs) {
      const ind = INDUSTRIES[inputs.industry] || INDUSTRIES['salon'];
      const services = ind.services;
      const bookingUrl = 'confirmbooking.online/book/' + inputs.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const servicesHTML = services.map(s => 
        '<tr>' +
          '<td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
            '<div style="font-size: 14px; font-weight: 500; color: #ffffff;">' + s.name + '</div>' +
            '<div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px;">' + s.duration + '</div>' +
          '</td>' +
          '<td style="padding: 12px 20px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
            '<span style="font-size: 15px; font-weight: 600; color: #ffffff;">' + (s.price === 0 ? 'Free' : '$' + s.price) + '</span>' +
          '</td>' +
        '</tr>'
      ).join('');

      const customBlock = inputs.customMessage ? 
        '<tr><td style="padding: 0 32px 24px; background-color: #000000;">' +
          '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 24px;">' +
            '<p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; font-style: italic;">"' + inputs.customMessage.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '"</p>' +
          '</div>' +
        '</td></tr>' : '';

      return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>html { scroll-behavior: smooth; } ::-webkit-scrollbar { display: none; }</style></head>' +
'<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;">' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">' +
'<tr><td align="center" style="padding: 40px 20px;">' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #000000; border-radius: 24px; overflow: hidden;">' +

'<tr><td style="padding: 48px 32px 24px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.4); margin-bottom: 16px;">Exclusive Preview For</div>' +
  '<h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -1.5px; color: #ffffff; line-height: 1.1;">' + inputs.businessName + '</h1>' +
  '<p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 300;">Your online booking experience, reimagined</p>' +
'</td></tr>' +

'<tr><td style="padding: 32px 32px 16px; background-color: #000000;">' +
  '<p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9); font-weight: 300; line-height: 1.6;">Hi ' + inputs.ownerName + ',</p>' +
  '<p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7;">I put together a quick preview of what your customers\\u2019 booking experience could look like with BookFlow. Everything below is a working mockup based on ' + inputs.businessName + '.</p>' +
'</td></tr>' +

customBlock +

'<tr><td style="padding: 8px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">1. Your Booking Page</div>' +
  '<div id="preview-booking" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; transition: box-shadow 0.5s ease;">' +
    '<div style="padding: 24px 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 8px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 20px; font-weight: 600; color: #ffffff;">Book an Appointment</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Select a service to get started</div>' +
    '</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
      servicesHTML +
    '</table>' +
    '<div style="padding: 16px 20px; text-align: center;">' +
      '<div style="display: inline-block; background: #f5f5f7; color: #000; padding: 10px 32px; border-radius: 100px; font-size: 13px; font-weight: 600;">Book Now</div>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">2. Your QR Code</div>' +
  '<div id="preview-qr" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; text-align: center; transition: box-shadow 0.5s ease;">' +
    '<div style="display: inline-block; background: #ffffff; padding: 12px; border-radius: 12px;">' +
      '<canvas id="qr-preview" width="140" height="140"></canvas>' +
    '</div>' +
    '<p style="margin: 12px 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">Customers scan to book instantly</p>' +
    '<p style="margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.3);">' + bookingUrl + '</p>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">3. Booking Confirmation Email</div>' +
  '<div id="preview-confirmed" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; transition: box-shadow 0.5s ease;">' +
    '<div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">CONFIRMED</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your booking has been secured</div>' +
    '</div>' +
    '<div style="padding: 16px 20px;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">' + services[0].name + '</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tuesday, March 4, 2026</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Time</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">2:30 PM</td></tr>' +
        '<tr><td colspan="2" style="padding: 8px 0;"><div style="height: 1px; background: rgba(255,255,255,0.08);"></div></td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Total</td><td style="text-align: right; font-size: 18px; font-weight: 700; color: #fff; padding: 6px 0;">' + (services[0].price === 0 ? 'Free' : '$' + services[0].price + '.00') + '</td></tr>' +
      '</table>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">4. Automatic Reminder Email</div>' +
  '<div id="preview-reminder" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; transition: box-shadow 0.5s ease;">' +
    '<div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">REMINDER</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your appointment is in 24 hours</div>' +
    '</div>' +
    '<div style="padding: 16px 20px;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">' + services[0].name + '</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tomorrow at 2:30 PM</td></tr>' +
      '</table>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 32px; text-align: center; background-color: #000000;">' +
  '<p style="margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.7;">This is just a taste. BookFlow handles online booking, automatic reminders, customer management, and payments \\u2014 all in one app.</p>' +
  '<a href="https://confirmbooking.online?utm_source=outreach&utm_medium=email&utm_campaign=cold-email" style="display: inline-block; background: #f5f5f7; color: #000; padding: 14px 40px; border-radius: 100px; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">Try BookFlow Free</a>' +
'</td></tr>' +

'<tr><td style="padding: 20px 32px 28px; background-color: #000000; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">' +
  '<p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.2);">Powered by BookFlow</p>' +
  '<p style="margin: 8px 0 0; font-size: 11px; color: rgba(255,255,255,0.25);">confirmbooking.online</p>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
    }

    function renderPreview() {
      const inputs = getInputs();
      const html = generateEmailHTML(inputs);
      const container = document.getElementById('emailPreview');
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.style.minHeight = '1200px';
      container.innerHTML = '';
      container.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      
      iframe.onload = function() {
        iframe.style.height = doc.body.scrollHeight + 40 + 'px';
      };
      setTimeout(function() {
        if (doc.body) iframe.style.height = doc.body.scrollHeight + 40 + 'px';
      }, 300);

      setTimeout(function() {
        try {
          const qrCanvas = doc.getElementById('qr-preview');
          if (qrCanvas && typeof QRCode !== 'undefined') {
            var bookingUrl = 'https://confirmbooking.online/book/' + inputs.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            QRCode.toCanvas(qrCanvas, bookingUrl, { width: 140, margin: 0, color: { dark: '#000000', light: '#ffffff' } });
          }
        } catch(e) { console.log('QR render skipped for iframe'); }
      }, 100);
    }

    function getEmailOnlyHTML(inputs) {
      const ind = INDUSTRIES[inputs.industry] || INDUSTRIES['salon'];
      const services = ind.services;
      const bookingUrl = 'https://confirmbooking.online/book/' + inputs.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const servicesHTML = services.map(s => 
        '<tr>' +
          '<td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
            '<div style="font-size: 14px; font-weight: 500; color: #ffffff;">' + s.name + '</div>' +
            '<div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px;">' + s.duration + '</div>' +
          '</td>' +
          '<td style="padding: 12px 20px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
            '<span style="font-size: 15px; font-weight: 600; color: #ffffff;">' + (s.price === 0 ? 'Free' : '$' + s.price) + '</span>' +
          '</td>' +
        '</tr>'
      ).join('');

      const customBlock = inputs.customMessage ? 
        '<tr><td style="padding: 0 32px 24px; background-color: #000000;">' +
          '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 24px;">' +
            '<p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; font-style: italic;">"' + inputs.customMessage.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '"</p>' +
          '</div>' +
        '</td></tr>' : '';

      return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
'<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;">' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">' +
'<tr><td align="center" style="padding: 40px 20px;">' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #000000; border-radius: 24px; overflow: hidden;">' +

'<tr><td style="padding: 48px 32px 24px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.4); margin-bottom: 16px;">Exclusive Preview For</div>' +
  '<h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -1.5px; color: #ffffff; line-height: 1.1;">' + inputs.businessName + '</h1>' +
  '<p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 300;">Your online booking experience, reimagined</p>' +
'</td></tr>' +

'<tr><td style="padding: 32px 32px 16px; background-color: #000000;">' +
  '<p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9); font-weight: 300; line-height: 1.6;">Hi ' + inputs.ownerName + ',</p>' +
  '<p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7;">I put together a quick preview of what your customers\\u2019 booking experience could look like with BookFlow. Everything below is a working mockup based on ' + inputs.businessName + '.</p>' +
'</td></tr>' +

customBlock +

'<tr><td style="padding: 8px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">1. Your Booking Page</div>' +
  '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">' +
    '<div style="padding: 24px 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 8px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 20px; font-weight: 600; color: #ffffff;">Book an Appointment</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Select a service to get started</div>' +
    '</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
      servicesHTML +
    '</table>' +
    '<div style="padding: 16px 20px; text-align: center;">' +
      '<div style="display: inline-block; background: #f5f5f7; color: #000; padding: 10px 32px; border-radius: 100px; font-size: 13px; font-weight: 600;">Book Now</div>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">2. Your QR Code</div>' +
  '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; text-align: center;">' +
    '<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(bookingUrl) + '&bgcolor=ffffff&color=000000" alt="QR Code" width="140" height="140" style="border-radius: 8px;" />' +
    '<p style="margin: 12px 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">Customers scan to book instantly</p>' +
    '<p style="margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.3);">' + bookingUrl.replace('https://','') + '</p>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">3. Booking Confirmation Email</div>' +
  '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">' +
    '<div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">CONFIRMED</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your booking has been secured</div>' +
    '</div>' +
    '<div style="padding: 16px 20px;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">' + services[0].name + '</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tuesday, March 4, 2026</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Time</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">2:30 PM</td></tr>' +
        '<tr><td colspan="2" style="padding: 8px 0;"><div style="height: 1px; background: rgba(255,255,255,0.08);"></div></td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Total</td><td style="text-align: right; font-size: 18px; font-weight: 700; color: #fff; padding: 6px 0;">' + (services[0].price === 0 ? 'Free' : '$' + services[0].price + '.00') + '</td></tr>' +
      '</table>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 24px 32px 8px; background-color: #000000;">' +
  '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">4. Automatic Reminder Email</div>' +
  '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">' +
    '<div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">' + inputs.businessName + '</div>' +
      '<div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">REMINDER</div>' +
      '<div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your appointment is in 24 hours</div>' +
    '</div>' +
    '<div style="padding: 16px 20px;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">' + services[0].name + '</td></tr>' +
        '<tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tomorrow at 2:30 PM</td></tr>' +
      '</table>' +
    '</div>' +
  '</div>' +
'</td></tr>' +

'<tr><td style="padding: 32px; text-align: center; background-color: #000000;">' +
  '<p style="margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.7;">This is just a taste. BookFlow handles online booking, automatic reminders, customer management, and payments \\u2014 all in one app.</p>' +
  '<a href="https://confirmbooking.online?utm_source=outreach&utm_medium=email&utm_campaign=cold-email" style="display: inline-block; background: #f5f5f7; color: #000; padding: 14px 40px; border-radius: 100px; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">Try BookFlow Free</a>' +
'</td></tr>' +

'<tr><td style="padding: 20px 32px 28px; background-color: #000000; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">' +
  '<p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.2);">Powered by BookFlow</p>' +
  '<p style="margin: 8px 0 0; font-size: 11px; color: rgba(255,255,255,0.25);">confirmbooking.online</p>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
    }

    async function copyHTML() {
      const inputs = getInputs();
      const html = getEmailOnlyHTML(inputs);
      const btn = document.getElementById('copyBtn');
      const originalText = btn.textContent;
      try {
        await navigator.clipboard.writeText(html);
        showToast('Email HTML copied to clipboard!', 'success');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      } catch(e) {
        const ta = document.createElement('textarea');
        ta.value = html;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Email HTML copied!', 'success');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      }
    }

    async function sendEmail() {
      const inputs = getInputs();
      if (!inputs.ownerEmail) {
        showToast('Please enter an email address', 'error');
        return;
      }
      const btn = document.getElementById('sendBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        const res = await fetch('/outreach/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Email sent to ' + inputs.ownerEmail + '!', 'success');
          btn.textContent = 'Sent!';
          setTimeout(() => { btn.textContent = originalText; }, 3000);
        } else {
          showToast('Failed: ' + (data.error || 'Unknown error'), 'error');
          btn.textContent = originalText;
        }
      } catch(e) {
        showToast('Network error: ' + e.message, 'error');
        btn.textContent = originalText;
      }
      btn.disabled = false;
    }

    ['ownerName','businessName','industry','ownerEmail','customMessage'].forEach(function(id) {
      document.getElementById(id).addEventListener('input', renderPreview);
      document.getElementById(id).addEventListener('change', renderPreview);
    });
    renderPreview();
  </script>
</body>
</html>`;
}

export function registerOutreachRoutes(app: Application): void {
  app.get("/outreach", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(outreachPage());
  });

  app.post("/outreach/send", async (req: Request, res: Response) => {
    try {
      const { ownerName, businessName, industry, ownerEmail, customMessage } = req.body;
      
      if (!ownerEmail) {
        return res.json({ success: false, error: "Email address required" });
      }

      const serverToken = process.env.POSTMARK_SERVER_TOKEN;
      if (!serverToken) {
        return res.json({ success: false, error: "Postmark not configured" });
      }

      const client = new postmark.ServerClient(serverToken);
      const ind = INDUSTRIES[industry] || INDUSTRIES['salon'];
      const services = ind.services;
      const bookingUrl = 'https://confirmbooking.online/book/' + businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const servicesHTML = services.map((s: any) => 
        `<tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 14px; font-weight: 500; color: #ffffff;">${s.name}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px;">${s.duration}</div>
          </td>
          <td style="padding: 12px 20px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="font-size: 15px; font-weight: 600; color: #ffffff;">${s.price === 0 ? 'Free' : '$' + s.price}</span>
          </td>
        </tr>`
      ).join('');

      const customBlock = customMessage ? 
        `<tr><td style="padding: 0 32px 24px; background-color: #000000;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 24px;">
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; font-style: italic;">"${customMessage.replace(/</g,'&lt;').replace(/>/g,'&gt;')}"</p>
          </div>
        </td></tr>` : '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
<tr><td align="center" style="padding: 40px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #000000; border-radius: 24px; overflow: hidden;">

<tr><td style="padding: 48px 32px 24px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);">
  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.4); margin-bottom: 16px;">Exclusive Preview For</div>
  <h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -1.5px; color: #ffffff; line-height: 1.1;">${businessName}</h1>
  <p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 300;">Your online booking experience, reimagined</p>
</td></tr>

<tr><td style="padding: 32px 32px 16px; background-color: #000000;">
  <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9); font-weight: 300; line-height: 1.6;">Hi ${ownerName || 'there'},</p>
  <p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7;">I put together a quick preview of what your customers\u2019 booking experience could look like with BookFlow. Everything below is a working mockup based on ${businessName}.</p>
</td></tr>

${customBlock}

<tr><td style="padding: 8px 32px 8px; background-color: #000000;">
  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">1. Your Booking Page</div>
  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">
    <div style="padding: 24px 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 8px;">${businessName}</div>
      <div style="font-size: 20px; font-weight: 600; color: #ffffff;">Book an Appointment</div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Select a service to get started</div>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${servicesHTML}
    </table>
    <div style="padding: 16px 20px; text-align: center;">
      <div style="display: inline-block; background: #f5f5f7; color: #000; padding: 10px 32px; border-radius: 100px; font-size: 13px; font-weight: 600;">Book Now</div>
    </div>
  </div>
</td></tr>

<tr><td style="padding: 24px 32px 8px; background-color: #000000;">
  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">2. Your QR Code</div>
  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; text-align: center;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=000000" alt="QR Code" width="140" height="140" style="border-radius: 8px;" />
    <p style="margin: 12px 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">Customers scan to book instantly</p>
    <p style="margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.3);">${bookingUrl.replace('https://', '')}</p>
  </div>
</td></tr>

<tr><td style="padding: 24px 32px 8px; background-color: #000000;">
  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">3. Booking Confirmation Email</div>
  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">
    <div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">${businessName}</div>
      <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">CONFIRMED</div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your booking has been secured</div>
    </div>
    <div style="padding: 16px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">${services[0].name}</td></tr>
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tuesday, March 4, 2026</td></tr>
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Time</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">2:30 PM</td></tr>
        <tr><td colspan="2" style="padding: 8px 0;"><div style="height: 1px; background: rgba(255,255,255,0.08);"></div></td></tr>
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Total</td><td style="text-align: right; font-size: 18px; font-weight: 700; color: #fff; padding: 6px 0;">${services[0].price === 0 ? 'Free' : '$' + services[0].price + '.00'}</td></tr>
      </table>
    </div>
  </div>
</td></tr>

<tr><td style="padding: 24px 32px 8px; background-color: #000000;">
  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.35); margin-bottom: 16px;">4. Automatic Reminder Email</div>
  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">
    <div style="padding: 20px 20px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-bottom: 6px;">${businessName}</div>
      <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">REMINDER</div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">Your appointment is in 24 hours</div>
    </div>
    <div style="padding: 16px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Service</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">${services[0].name}</td></tr>
        <tr><td style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding: 6px 0;">Date</td><td style="text-align: right; font-size: 13px; font-weight: 600; color: #fff; padding: 6px 0;">Tomorrow at 2:30 PM</td></tr>
      </table>
    </div>
  </div>
</td></tr>

<tr><td style="padding: 32px; text-align: center; background-color: #000000;">
  <p style="margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.7;">This is just a taste. BookFlow handles online booking, automatic reminders, customer management, and payments \u2014 all in one app.</p>
  <a href="https://confirmbooking.online?utm_source=outreach&utm_medium=email&utm_campaign=cold-email" style="display: inline-block; background: #f5f5f7; color: #000; padding: 14px 40px; border-radius: 100px; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">Try BookFlow Free</a>
</td></tr>

<tr><td style="padding: 20px 32px 28px; background-color: #000000; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
  <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.2);">Powered by BookFlow</p>
  <p style="margin: 8px 0 0; font-size: 11px; color: rgba(255,255,255,0.25);">confirmbooking.online</p>
</td></tr>

</table></td></tr></table></body></html>`;

      await client.sendEmail({
        From: `BookFlow <bookings@confirmbooking.online>`,
        To: ownerEmail,
        Subject: `${ownerName || 'Hi'} \u2014 a preview of ${businessName} on BookFlow`,
        HtmlBody: html,
        MessageStream: "outbound",
      });

      console.log(`[Outreach] Email sent to ${ownerEmail} for ${businessName}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Outreach] Send error:', error);
      res.json({ success: false, error: error.message || 'Failed to send' });
    }
  });

  console.log('[Outreach] Registered /outreach routes');
}
