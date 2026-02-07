import type { Application, Request, Response } from "express";

const DOMAIN = "https://confirmbooking.online";
const BRAND = "ConfirmBooking";
const TAGLINE = "Smart Booking For Modern Businesses";
const DOWNLOAD_LINK = "https://confirmbooking.online";

const INDUSTRIES = [
  "salon", "barbershop", "spa", "auto-detailing", "fitness", "yoga",
  "dental", "medical", "veterinary", "tattoo", "massage", "photography",
  "tutoring", "consulting", "coaching", "cleaning", "plumbing", "electrical",
  "hvac", "landscaping",
];

const LOCATIONS = [
  "new-york", "los-angeles", "chicago", "houston", "phoenix", "philadelphia",
  "san-antonio", "san-diego", "dallas", "san-jose", "austin", "jacksonville",
  "san-francisco", "columbus", "charlotte", "indianapolis", "seattle", "denver",
  "washington-dc", "nashville", "atlanta", "miami", "tampa", "portland",
  "las-vegas", "sacramento", "mesa", "kansas-city", "long-beach", "raleigh",
  "oakland", "minneapolis", "tulsa", "bakersfield", "aurora", "anaheim",
  "honolulu", "santa-ana", "riverside", "stockton", "henderson", "st-louis",
  "pittsburgh", "cincinnati", "milwaukee", "orlando", "boise", "tucson",
  "omaha", "el-paso", "detroit",
];

const COMPETITORS = [
  "calendly", "acuity-scheduling", "square-appointments", "vagaro", "mindbody",
  "fresha", "booksy", "setmore", "simplybook", "schedulicity",
];

function formatIndustryName(slug: string): string {
  const map: Record<string, string> = {
    "salon": "Salons",
    "barbershop": "Barbershops",
    "spa": "Spas",
    "auto-detailing": "Auto Detailing",
    "fitness": "Fitness Studios",
    "yoga": "Yoga Studios",
    "dental": "Dental Practices",
    "medical": "Medical Practices",
    "veterinary": "Veterinary Clinics",
    "tattoo": "Tattoo Studios",
    "massage": "Massage Therapists",
    "photography": "Photography Studios",
    "tutoring": "Tutoring Services",
    "consulting": "Consulting Firms",
    "coaching": "Coaching Practices",
    "cleaning": "Cleaning Services",
    "plumbing": "Plumbing Services",
    "electrical": "Electrical Services",
    "hvac": "HVAC Services",
    "landscaping": "Landscaping Services",
  };
  return map[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatIndustrySingular(slug: string): string {
  const map: Record<string, string> = {
    "salon": "Salon",
    "barbershop": "Barbershop",
    "spa": "Spa",
    "auto-detailing": "Auto Detailing",
    "fitness": "Fitness Studio",
    "yoga": "Yoga Studio",
    "dental": "Dental Practice",
    "medical": "Medical Practice",
    "veterinary": "Veterinary Clinic",
    "tattoo": "Tattoo Studio",
    "massage": "Massage Therapist",
    "photography": "Photography Studio",
    "tutoring": "Tutoring Service",
    "consulting": "Consulting Firm",
    "coaching": "Coaching Practice",
    "cleaning": "Cleaning Service",
    "plumbing": "Plumbing Service",
    "electrical": "Electrical Service",
    "hvac": "HVAC Service",
    "landscaping": "Landscaping Service",
  };
  return map[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatLocationName(slug: string): string {
  const map: Record<string, string> = {
    "new-york": "New York",
    "los-angeles": "Los Angeles",
    "chicago": "Chicago",
    "houston": "Houston",
    "phoenix": "Phoenix",
    "philadelphia": "Philadelphia",
    "san-antonio": "San Antonio",
    "san-diego": "San Diego",
    "dallas": "Dallas",
    "san-jose": "San Jose",
    "austin": "Austin",
    "jacksonville": "Jacksonville",
    "san-francisco": "San Francisco",
    "columbus": "Columbus",
    "charlotte": "Charlotte",
    "indianapolis": "Indianapolis",
    "seattle": "Seattle",
    "denver": "Denver",
    "washington-dc": "Washington DC",
    "nashville": "Nashville",
    "atlanta": "Atlanta",
    "miami": "Miami",
    "tampa": "Tampa",
    "portland": "Portland",
    "las-vegas": "Las Vegas",
    "sacramento": "Sacramento",
    "mesa": "Mesa",
    "kansas-city": "Kansas City",
    "long-beach": "Long Beach",
    "raleigh": "Raleigh",
    "oakland": "Oakland",
    "minneapolis": "Minneapolis",
    "tulsa": "Tulsa",
    "bakersfield": "Bakersfield",
    "aurora": "Aurora",
    "anaheim": "Anaheim",
    "honolulu": "Honolulu",
    "santa-ana": "Santa Ana",
    "riverside": "Riverside",
    "stockton": "Stockton",
    "henderson": "Henderson",
    "st-louis": "St. Louis",
    "pittsburgh": "Pittsburgh",
    "cincinnati": "Cincinnati",
    "milwaukee": "Milwaukee",
    "orlando": "Orlando",
    "boise": "Boise",
    "tucson": "Tucson",
    "omaha": "Omaha",
    "el-paso": "El Paso",
    "detroit": "Detroit",
  };
  return map[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatCompetitorName(slug: string): string {
  const map: Record<string, string> = {
    "calendly": "Calendly",
    "acuity-scheduling": "Acuity Scheduling",
    "square-appointments": "Square Appointments",
    "vagaro": "Vagaro",
    "mindbody": "Mindbody",
    "fresha": "Fresha",
    "booksy": "Booksy",
    "setmore": "Setmore",
    "simplybook": "SimplyBook",
    "schedulicity": "Schedulicity",
  };
  return map[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getCompetitorDescription(slug: string): string {
  const map: Record<string, string> = {
    "calendly": "a general-purpose scheduling tool popular for meetings and consultations",
    "acuity-scheduling": "a scheduling platform by Squarespace focused on appointment booking",
    "square-appointments": "Square's booking solution bundled with their payment ecosystem",
    "vagaro": "a salon and spa management platform with booking capabilities",
    "mindbody": "a wellness and fitness business management platform",
    "fresha": "a free booking platform primarily for beauty and wellness businesses",
    "booksy": "a booking app focused on barbershops and beauty services",
    "setmore": "a free online appointment scheduling software",
    "simplybook": "a customizable booking system for various service industries",
    "schedulicity": "an appointment scheduling and marketing platform for service businesses",
  };
  return map[slug] || "a scheduling platform";
}

function getIndustryBenefits(slug: string): string[] {
  const defaults = [
    "Online booking available 24/7 for your clients",
    "Automated appointment reminders to reduce no-shows",
    "Client profile tracking and booking history",
    "Customizable booking pages that match your brand",
    "Revenue analytics and business insights",
    "QR code generation for easy client access",
  ];
  const specific: Record<string, string[]> = {
    "salon": ["Track stylist schedules and chair availability", "Service add-ons and package deals", "Client preference notes for personalized visits"],
    "barbershop": ["Walk-in and appointment hybrid management", "Queue management for busy periods", "Loyalty tracking for regular clients"],
    "spa": ["Multi-room and treatment scheduling", "Package and membership management", "Intake forms and health questionnaires"],
    "auto-detailing": ["Vehicle tracking and service history", "Mobile detailing route optimization", "Before/after photo documentation"],
    "dental": ["Patient intake forms and medical history", "Insurance and billing integration", "Treatment plan scheduling across visits"],
    "medical": ["HIPAA-compliant appointment management", "Patient portal with secure messaging", "Multi-provider scheduling coordination"],
    "fitness": ["Class scheduling and capacity management", "Membership tier management", "Trainer availability and specialization tracking"],
  };
  return [...defaults, ...(specific[slug] || [])];
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
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${BRAND}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
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
        <a href="/seo" class="flex items-center space-x-1">
          <span class="font-heading text-2xl font-semibold text-pearl tracking-tight">Confirm</span><span class="font-body text-2xl font-light text-silver">Booking</span>
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
          <div class="flex items-center space-x-1 mb-4">
            <span class="font-heading text-xl font-semibold text-pearl">Confirm</span><span class="font-body text-xl font-light text-silver">Booking</span>
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
            <li><a href="/tools" class="text-silver text-sm hover:text-pearl transition-colors">Free Tools</a></li>
            <li><a href="/tools/no-show-calculator" class="text-silver text-sm hover:text-pearl transition-colors">No-Show Calculator</a></li>
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

  const orgJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": BRAND,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "iOS, Android, Web",
    "description": `${BRAND} - ${TAGLINE}`,
    "url": DOMAIN,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  });

  const body = `
  <script type="application/ld+json">${orgJsonLd}</script>

  <section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-pure-black to-pure-black"></div>
    <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 25% 25%, rgba(245,245,247,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(245,245,247,0.05) 0%, transparent 50%);"></div>
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
  </section>

  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div class="text-center mb-16">
      <h2 class="font-heading text-4xl sm:text-5xl font-semibold mb-4">Why ${BRAND}?</h2>
      <p class="text-silver text-lg max-w-2xl mx-auto">Everything your business needs to manage appointments like a premium brand.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      ${[
        { title: "24/7 Online Booking", desc: "Let your clients book appointments anytime, from any device. Your booking page is always open." },
        { title: "Smart Reminders", desc: "Automated email reminders reduce no-shows. Never lose revenue to missed appointments." },
        { title: "Booking Analytics", desc: "Track bookings and business insights with a beautiful dashboard built for clarity." },
        { title: "Client Profiles", desc: "Keep track of client booking history and preferences for a personalized experience." },
        { title: "QR Code Booking", desc: "Provide a touchless booking experience with custom QR codes for your storefront or marketing." },
        { title: "Brand-Matched Pages", desc: "Your online booking page matches your brand identity. Premium, professional, and conversion-optimized." },
      ].map(f => `
        <div class="glass-card rounded-2xl p-8">
          <h3 class="font-heading text-2xl font-semibold mb-3 text-pearl">${f.title}</h3>
          <p class="text-silver leading-relaxed">${f.desc}</p>
        </div>
      `).join("")}
    </div>
  </section>

  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div class="text-center mb-16">
      <h2 class="font-heading text-4xl sm:text-5xl font-semibold mb-4">Built for Every Industry</h2>
      <p class="text-silver text-lg">From salons to consulting firms, ${BRAND} adapts to your workflow.</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${INDUSTRIES.map(i => `
        <a href="/booking-software/${i}" class="glass-card rounded-xl p-4 text-center block">
          <span class="text-pearl text-sm font-medium">${formatIndustryName(i)}</span>
        </a>
      `).join("")}
    </div>
  </section>

  <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
    <div class="glass-card rounded-3xl p-12 sm:p-16">
      <h2 class="font-heading text-4xl sm:text-5xl font-semibold mb-6">Ready to Modernize Your Bookings?</h2>
      <p class="text-silver text-lg mb-10 max-w-xl mx-auto">Join thousands of service professionals already using ${BRAND} to grow their business.</p>
      <a href="${utmLink("seo", "organic", "homepage-bottom-cta")}" class="cta-btn text-base">Get Started Free</a>
    </div>
  </section>`;

  return wrapPage(head, body);
}

function industryLocationPage(industry: string, location: string): string {
  const industryName = formatIndustryName(industry);
  const industrySingular = formatIndustrySingular(industry);
  const locationName = formatLocationName(location);
  const title = `Best Booking Software for ${industryName} in ${locationName} | ${BRAND}`;
  const description = `${BRAND} is the top-rated booking software for ${industryName.toLowerCase()} in ${locationName}. Reduce no-shows, accept online bookings 24/7, and grow your ${industrySingular.toLowerCase()} business.`;
  const canonical = `${DOMAIN}/booking-software/${industry}/${location}`;
  const keywords = `booking software ${industryName.toLowerCase()} ${locationName}, ${industrySingular.toLowerCase()} appointment scheduling ${locationName}, online booking ${locationName}`;
  const ctaUrl = utmLink("seo", "organic", "programmatic", `${industry}-${location}`);
  const benefits = getIndustryBenefits(industry);

  const head = headTags(title, description, canonical, keywords);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${BRAND} for ${industryName}`,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "iOS, Android, Web",
    "description": description,
    "url": canonical,
    "areaServed": {
      "@type": "City",
      "name": locationName,
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  });

  const body = `
  <script type="application/ld+json">${jsonLd}</script>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Industries", href: "/booking-software" },
      { label: industryName, href: `/booking-software/${industry}` },
      { label: locationName },
    ])}

    <section class="mb-20">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        Booking Software for<br><span class="text-silver">${industryName} in ${locationName}</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
        ${BRAND} helps ${industryName.toLowerCase()} in ${locationName} streamline appointment scheduling, reduce no-shows, and deliver a premium booking experience to every client. Accept online bookings 24/7 and let your ${industrySingular.toLowerCase()} focus on what it does best.
      </p>
      <a href="${ctaUrl}" class="cta-btn">Start Free for Your ${industrySingular}</a>
    </section>

    <section class="mb-20">
      <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-8">Why ${locationName} ${industryName} Choose ${BRAND}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${benefits.slice(0, 6).map(b => `
          <div class="glass-card rounded-2xl p-6">
            <div class="w-8 h-8 rounded-full border border-pearl/20 flex items-center justify-center mb-4 text-pearl text-sm">&#10003;</div>
            <p class="text-pearl text-sm leading-relaxed">${b}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="mb-20">
      <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-6">How ${BRAND} Works for ${industryName}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${[
          { step: "1", title: "Set Up Your Profile", desc: `Create your ${industrySingular.toLowerCase()} profile, add your services, pricing, and team member availability in minutes.` },
          { step: "2", title: "Share Your Booking Link", desc: `Share your personalized booking page via your website, social media, or QR code. Clients in ${locationName} can book 24/7.` },
          { step: "3", title: "Manage & Grow", desc: `Track appointments, send automated reminders, and use revenue insights to grow your ${industrySingular.toLowerCase()} in ${locationName}.` },
        ].map(s => `
          <div class="glass-card rounded-2xl p-8 text-center">
            <div class="w-12 h-12 rounded-full bg-pearl/10 flex items-center justify-center mx-auto mb-4">
              <span class="text-pearl font-heading text-xl font-semibold">${s.step}</span>
            </div>
            <h3 class="font-heading text-xl font-semibold mb-3 text-pearl">${s.title}</h3>
            <p class="text-silver text-sm leading-relaxed">${s.desc}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="mb-20">
      <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-6">Frequently Asked Questions</h2>
      <div class="space-y-6 max-w-3xl">
        ${[
          { q: `Is ${BRAND} suitable for ${industryName.toLowerCase()} in ${locationName}?`, a: `Absolutely. ${BRAND} is designed for service businesses including ${industryName.toLowerCase()}. It works for businesses of all sizes in ${locationName} and surrounding areas.` },
          { q: `How much does ${BRAND} cost?`, a: `${BRAND} offers a free plan to get started. Premium features are available at affordable monthly pricing as your business grows.` },
          { q: `Can my clients book online?`, a: `Yes. Your clients get a beautiful, branded booking page accessible from any device, 24 hours a day, 7 days a week.` },
          { q: `Does ${BRAND} help reduce no-shows?`, a: `Yes. Automated appointment reminders via SMS and email can reduce no-shows by up to 40%, saving your ${industrySingular.toLowerCase()} thousands per year.` },
        ].map(f => `
          <div class="glass-card rounded-xl p-6">
            <h3 class="text-pearl font-semibold mb-2">${f.q}</h3>
            <p class="text-silver text-sm leading-relaxed">${f.a}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="text-center py-16">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Start Booking Smarter in ${locationName}</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">Join ${industryName.toLowerCase()} across ${locationName} already using ${BRAND} to grow.</p>
        <a href="${ctaUrl}" class="cta-btn">Get Started Free</a>
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function industryDirectoryPage(industry: string): string {
  const industryName = formatIndustryName(industry);
  const title = `Booking Software for ${industryName} | ${BRAND}`;
  const description = `Find ${BRAND} booking software for ${industryName.toLowerCase()} in major cities across the US. Online scheduling, automated reminders, and smart business tools.`;
  const canonical = `${DOMAIN}/booking-software/${industry}`;
  const keywords = `${industryName.toLowerCase()} booking software, ${industryName.toLowerCase()} appointment scheduling, ${industryName.toLowerCase()} online booking`;

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Industries", href: "/booking-software" },
      { label: industryName },
    ])}

    <section class="mb-16">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        Booking Software<br><span class="text-silver">for ${industryName}</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
        ${BRAND} provides powerful online scheduling tools built specifically for ${industryName.toLowerCase()}. Choose your city below to learn how we can help your business.
      </p>
      <a href="${utmLink("seo", "organic", "industry-directory", industry)}" class="cta-btn">Get Started Free</a>
    </section>

    <section>
      <h2 class="font-heading text-3xl font-semibold mb-8">Available Locations</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        ${LOCATIONS.map(loc => `
          <a href="/booking-software/${industry}/${loc}" class="glass-card rounded-xl p-4 text-center block">
            <span class="text-pearl text-sm font-medium">${formatLocationName(loc)}</span>
          </a>
        `).join("")}
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function mainDirectoryPage(): string {
  const title = `Booking Software for Every Industry | ${BRAND}`;
  const description = `Explore ${BRAND} booking software solutions for 20+ service industries. Find the perfect scheduling tool for your business.`;
  const canonical = `${DOMAIN}/booking-software`;
  const keywords = "booking software, appointment scheduling, online booking, service business software";

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Industries" },
    ])}

    <section class="mb-16">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        Booking Software<br><span class="text-silver">for Every Industry</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
        No matter your industry, ${BRAND} adapts to your workflow. Explore our specialized booking solutions for ${INDUSTRIES.length}+ service categories across ${LOCATIONS.length}+ cities.
      </p>
    </section>

    <section>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        ${INDUSTRIES.map(i => `
          <a href="/booking-software/${i}" class="glass-card rounded-2xl p-8 block group">
            <h2 class="font-heading text-2xl font-semibold text-pearl mb-2 group-hover:text-white">${formatIndustryName(i)}</h2>
            <p class="text-silver text-sm">${LOCATIONS.length} locations available</p>
            <span class="text-silver text-xs mt-4 inline-block group-hover:text-pearl transition-colors">View locations &rarr;</span>
          </a>
        `).join("")}
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function comparisonPage(competitor: string): string {
  const competitorName = formatCompetitorName(competitor);
  const competitorDesc = getCompetitorDescription(competitor);
  const title = `${BRAND} vs ${competitorName} | Booking Software Comparison`;
  const description = `Compare ${BRAND} and ${competitorName}. See why service businesses switch from ${competitorName} to ${BRAND} for better scheduling, fewer no-shows, and premium client experiences.`;
  const canonical = `${DOMAIN}/compare/${competitor}`;
  const keywords = `${BRAND} vs ${competitorName}, ${competitorName} alternative, booking software comparison, best scheduling app`;
  const ctaUrl = utmLink("seo", "organic", "comparison", competitor);

  const head = headTags(title, description, canonical, keywords);

  const features = [
    { feature: "Free Plan Available", cb: "Yes", comp: "Limited" },
    { feature: "Automated Reminders", cb: "Email", comp: "Email only" },
    { feature: "No-Show Protection", cb: "Built-in", comp: "Limited" },
    { feature: "Client Profiles", cb: "Basic", comp: "Basic" },
    { feature: "Business Analytics", cb: "Dashboard", comp: "Basic reports" },
    { feature: "Branded Booking Pages", cb: "Fully customizable", comp: "Limited branding" },
    { feature: "Mobile App", cb: "iOS + Android", comp: "Varies" },
    { feature: "QR Code Booking", cb: "Built-in", comp: "Not available" },
    { feature: "Service Industry Focus", cb: "20+ industries", comp: "General purpose" },
  ];

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Compare", href: "/compare" },
      { label: `${BRAND} vs ${competitorName}` },
    ])}

    <section class="mb-20">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        ${BRAND} vs<br><span class="text-silver">${competitorName}</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
        ${competitorName} is ${competitorDesc}. ${BRAND} is purpose-built for service businesses that want premium scheduling, automated no-show prevention, and a beautiful client experience. See how they compare.
      </p>
      <a href="${ctaUrl}" class="cta-btn">Switch to ${BRAND}</a>
    </section>

    <section class="mb-20 overflow-x-auto">
      <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-8">Feature Comparison</h2>
      <table class="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr class="border-b border-white/10">
            <th class="font-heading text-xl py-4 px-4 text-pearl font-semibold">Feature</th>
            <th class="font-heading text-xl py-4 px-4 text-pearl font-semibold bg-white/5">${BRAND}</th>
            <th class="font-heading text-xl py-4 px-4 text-silver font-normal">${competitorName}</th>
          </tr>
        </thead>
        <tbody>
          ${features.map(f => `
            <tr class="border-b border-white/5">
              <td class="py-4 px-4 text-pearl font-medium text-sm">${f.feature}</td>
              <td class="py-4 px-4 text-pearl font-semibold text-sm bg-white/5">${f.cb}</td>
              <td class="py-4 px-4 text-silver text-sm">${f.comp}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>

    <section class="mb-20">
      <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-8">Why Businesses Switch from ${competitorName}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${[
          { title: "Purpose-Built for Services", desc: `Unlike ${competitorName}, ${BRAND} is designed exclusively for service businesses. Every feature is tailored to how you actually work.` },
          { title: "Reduce No-Shows by 40%", desc: `Our smart reminder system uses SMS and email to ensure clients show up. Most ${competitorName} users lack this critical feature.` },
          { title: "Premium Client Experience", desc: `Your booking page reflects your brand's quality. ${BRAND} delivers a premium, conversion-optimized experience ${competitorName} can't match.` },
        ].map(c => `
          <div class="glass-card rounded-2xl p-8">
            <h3 class="font-heading text-2xl font-semibold mb-3 text-pearl">${c.title}</h3>
            <p class="text-silver leading-relaxed text-sm">${c.desc}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="text-center py-16">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Ready to Upgrade from ${competitorName}?</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">Start free and see why service businesses choose ${BRAND}.</p>
        <a href="${ctaUrl}" class="cta-btn">Get Started Free</a>
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function compareDirectoryPage(): string {
  const title = `Compare ${BRAND} vs Competitors | Booking Software Comparisons`;
  const description = `See how ${BRAND} stacks up against Calendly, Acuity, Vagaro, Mindbody, and other booking platforms. Detailed feature comparisons for service businesses.`;
  const canonical = `${DOMAIN}/compare`;
  const keywords = `booking software comparison, ${BRAND} vs competitors, best scheduling app, appointment software alternatives`;

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Compare" },
    ])}

    <section class="mb-16">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        ${BRAND} vs<br><span class="text-silver">The Competition</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
        We believe in transparency. Compare ${BRAND} against the most popular booking platforms and see why service businesses are making the switch.
      </p>
    </section>

    <section>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${COMPETITORS.map(c => `
          <a href="/compare/${c}" class="glass-card rounded-2xl p-8 block group">
            <h2 class="font-heading text-2xl font-semibold text-pearl mb-2">${BRAND} vs ${formatCompetitorName(c)}</h2>
            <p class="text-silver text-sm mb-4">${formatCompetitorName(c)} is ${getCompetitorDescription(c)}. See how ${BRAND} compares.</p>
            <span class="text-silver text-xs group-hover:text-pearl transition-colors">Read comparison &rarr;</span>
          </a>
        `).join("")}
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function noShowCalculatorPage(): string {
  const title = `No-Show Cost Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate how much revenue your business loses to no-shows each year. Free calculator tool by ${BRAND}. Discover the true cost and learn how to reduce it.`;
  const canonical = `${DOMAIN}/tools/no-show-calculator`;
  const keywords = "no-show calculator, appointment no-show cost, reduce no-shows, booking no-show revenue loss";
  const ctaUrl = utmLink("seo", "tool", "noshow-calculator");

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "No-Show Cost Calculator" },
    ])}

    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        No-Show Cost<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">
        Find out how much revenue your business loses to appointment no-shows every year. Enter your numbers below and see the impact.
      </p>
    </section>

    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="space-y-8">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="appointments">Appointments per week</label>
          <input type="number" id="appointments" value="30" min="1" max="500"
            class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="price">Average service price ($)</label>
          <input type="number" id="price" value="75" min="1" max="10000"
            class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rate">No-show rate (%)</label>
          <input type="range" id="rate" value="15" min="1" max="50"
            class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-silver text-xs mt-1">
            <span>1%</span>
            <span id="rateDisplay" class="text-pearl font-semibold text-lg">15%</span>
            <span>50%</span>
          </div>
        </div>
      </div>

      <div class="mt-10 pt-10 border-t border-white/10 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Estimated annual revenue lost to no-shows</p>
        <p id="result" class="font-heading text-5xl sm:text-6xl font-semibold text-pearl">$17,550</p>
        <p class="text-silver text-sm mt-4">That's money you could recover with automated appointment reminders.</p>
      </div>
    </section>

    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Reduce No-Shows with ${BRAND}</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND}'s smart reminders can reduce no-shows by up to 40%. Stop losing revenue to missed appointments.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>

  <script>
    (function() {
      var apptEl = document.getElementById('appointments');
      var priceEl = document.getElementById('price');
      var rateEl = document.getElementById('rate');
      var rateDisplay = document.getElementById('rateDisplay');
      var resultEl = document.getElementById('result');

      function calculate() {
        var appts = parseInt(apptEl.value) || 0;
        var price = parseInt(priceEl.value) || 0;
        var rate = parseInt(rateEl.value) || 0;
        rateDisplay.textContent = rate + '%';
        var annualLoss = appts * price * (rate / 100) * 52;
        resultEl.textContent = '$' + annualLoss.toLocaleString('en-US', { maximumFractionDigits: 0 });
      }

      apptEl.addEventListener('input', calculate);
      priceEl.addEventListener('input', calculate);
      rateEl.addEventListener('input', calculate);
      calculate();
    })();
  </script>`;

  return wrapPage(head, body);
}

function toolsDirectoryPage(): string {
  const title = `Free Business Tools | ${BRAND}`;
  const description = `Free tools for service businesses. Calculate no-show costs, optimize your scheduling, and grow your business with ${BRAND}.`;
  const canonical = `${DOMAIN}/tools`;
  const keywords = "free business tools, no-show calculator, booking tools, scheduling tools";

  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools" },
    ])}

    <section class="mb-16">
      <h1 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight">
        Free Business<br><span class="text-silver">Tools</span>
      </h1>
      <p class="text-silver text-lg sm:text-xl max-w-3xl leading-relaxed">
        Practical tools to help you understand your business performance and make smarter decisions. No signup required.
      </p>
    </section>

    <section>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="/tools/no-show-calculator" class="glass-card rounded-2xl p-8 block group">
          <div class="w-12 h-12 rounded-xl bg-pearl/10 flex items-center justify-center mb-6">
            <span class="text-pearl text-xl font-heading font-semibold">$</span>
          </div>
          <h2 class="font-heading text-2xl font-semibold text-pearl mb-3">No-Show Cost Calculator</h2>
          <p class="text-silver text-sm mb-4 leading-relaxed">Find out how much revenue your business loses to appointment no-shows every year. Enter your numbers and see the impact instantly.</p>
          <span class="text-silver text-xs group-hover:text-pearl transition-colors">Try it free &rarr;</span>
        </a>
      </div>
    </section>
  </div>`;

  return wrapPage(head, body);
}

function generateSitemap(): string {
  const urls: string[] = [];

  const addUrl = (path: string, priority: string, changefreq: string) => {
    urls.push(`  <url>
    <loc>${DOMAIN}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  };

  addUrl("/seo", "1.0", "weekly");
  addUrl("/booking-software", "0.9", "weekly");
  addUrl("/compare", "0.8", "weekly");
  addUrl("/tools", "0.8", "monthly");
  addUrl("/tools/no-show-calculator", "0.7", "monthly");

  for (const industry of INDUSTRIES) {
    addUrl(`/booking-software/${industry}`, "0.8", "weekly");
    for (const location of LOCATIONS) {
      addUrl(`/booking-software/${industry}/${location}`, "0.6", "monthly");
    }
  }

  for (const competitor of COMPETITORS) {
    addUrl(`/compare/${competitor}`, "0.7", "monthly");
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

export function registerSeoRoutes(app: Application): void {

  app.get("/seo", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(seoHomepage());
  });

  app.get("/booking-software", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(mainDirectoryPage());
  });

  app.get("/booking-software/:industry", (req: Request, res: Response) => {
    const { industry } = req.params;
    if (!INDUSTRIES.includes(industry)) {
      return res.status(404).send(wrapPage(
        headTags("Page Not Found | " + BRAND, "The page you're looking for doesn't exist.", DOMAIN, ""),
        `<div class="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 class="font-heading text-5xl font-semibold mb-4">Page Not Found</h1>
          <p class="text-silver text-lg mb-8">The industry you're looking for doesn't exist.</p>
          <a href="/booking-software" class="cta-btn">Browse All Industries</a>
        </div>`
      ));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(industryDirectoryPage(industry));
  });

  app.get("/booking-software/:industry/:location", (req: Request, res: Response) => {
    const { industry, location } = req.params;
    if (!INDUSTRIES.includes(industry) || !LOCATIONS.includes(location)) {
      return res.status(404).send(wrapPage(
        headTags("Page Not Found | " + BRAND, "The page you're looking for doesn't exist.", DOMAIN, ""),
        `<div class="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 class="font-heading text-5xl font-semibold mb-4">Page Not Found</h1>
          <p class="text-silver text-lg mb-8">The page you're looking for doesn't exist.</p>
          <a href="/booking-software" class="cta-btn">Browse All Industries</a>
        </div>`
      ));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(industryLocationPage(industry, location));
  });

  app.get("/compare", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(compareDirectoryPage());
  });

  app.get("/compare/:competitor", (req: Request, res: Response) => {
    const { competitor } = req.params;
    if (!COMPETITORS.includes(competitor)) {
      return res.status(404).send(wrapPage(
        headTags("Page Not Found | " + BRAND, "The page you're looking for doesn't exist.", DOMAIN, ""),
        `<div class="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 class="font-heading text-5xl font-semibold mb-4">Page Not Found</h1>
          <p class="text-silver text-lg mb-8">That comparison doesn't exist.</p>
          <a href="/compare" class="cta-btn">Browse All Comparisons</a>
        </div>`
      ));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(comparisonPage(competitor));
  });

  app.get("/tools", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(toolsDirectoryPage());
  });

  app.get("/tools/no-show-calculator", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(noShowCalculatorPage());
  });

  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(generateSitemap());
  });

  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(generateRobotsTxt());
  });

  console.log(`[SEO] Registered SEO routes: ${INDUSTRIES.length} industries x ${LOCATIONS.length} locations = ${INDUSTRIES.length * LOCATIONS.length} programmatic pages + ${COMPETITORS.length} comparison pages + tools`);
}
