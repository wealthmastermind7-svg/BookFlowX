import Postmark from "postmark";
import { prospectLeads, ProspectedLead } from "./kimiClaw";

const DOMAIN = "https://confirmbooking.online";

const NICHES = [
  "auto-detailing", "salon", "barbershop", "fitness",
  "spa", "tattoo", "massage", "yoga", "therapy", "personal-trainer"
];

const TIER1_US = [
  "Austin, TX", "Nashville, TN", "Charlotte, NC", "Raleigh, NC",
  "Tampa, FL", "Orlando, FL", "Jacksonville, FL", "San Antonio, TX",
  "Phoenix, AZ", "Las Vegas, NV", "Denver, CO", "Portland, OR",
  "Sacramento, CA", "San Diego, CA", "Fort Worth, TX", "Columbus, OH",
  "Indianapolis, IN", "Kansas City, MO", "Oklahoma City, OK", "Memphis, TN",
];

const TIER2_US = [
  "Boise, ID", "Scottsdale, AZ", "Gilbert, AZ", "Mesa, AZ",
  "Frisco, TX", "Plano, TX", "McKinney, TX", "Round Rock, TX",
  "Alpharetta, GA", "Marietta, GA", "Roswell, GA", "Savannah, GA",
  "Clearwater, FL", "St. Petersburg, FL", "Naples, FL", "Sarasota, FL",
  "Asheville, NC", "Wilmington, NC", "Durham, NC", "Greenville, SC",
  "Charleston, SC", "Chattanooga, TN", "Knoxville, TN", "Franklin, TN",
  "Bend, OR", "Beaverton, OR", "Eugene, OR", "Spokane, WA",
  "Bellevue, WA", "Tacoma, WA", "Colorado Springs, CO", "Boulder, CO",
  "Henderson, NV", "Reno, NV", "Omaha, NE", "Des Moines, IA",
  "Madison, WI", "Ann Arbor, MI", "Grand Rapids, MI",
  "Richmond, VA", "Virginia Beach, VA", "Chesapeake, VA",
];

const TIER3_SUBURBS_COUNTIES = [
  "Orange County, CA", "Westchester County, NY", "Nassau County, NY",
  "Montgomery County, MD", "Fairfax County, VA", "DuPage County, IL",
  "Loudoun County, VA", "Collin County, TX", "Williamson County, TX",
  "Wake County, NC", "Mecklenburg County, NC", "Fulton County, GA",
  "Maricopa County, AZ", "Clark County, NV", "King County, WA",
  "Pinellas County, FL", "Palm Beach County, FL", "Broward County, FL",
  "Bergen County, NJ", "Morris County, NJ", "Monmouth County, NJ",
];

const INTERNATIONAL = [
  "Toronto, Canada", "Vancouver, Canada", "Calgary, Canada", "Ottawa, Canada",
  "Montreal, Canada", "Edmonton, Canada", "Winnipeg, Canada", "Halifax, Canada",
  "London, UK", "Manchester, UK", "Birmingham, UK", "Bristol, UK",
  "Edinburgh, UK", "Leeds, UK", "Glasgow, UK", "Brighton, UK",
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia",
  "Perth, Australia", "Adelaide, Australia", "Gold Coast, Australia",
  "Auckland, New Zealand", "Wellington, New Zealand", "Christchurch, New Zealand",
  "Dublin, Ireland", "Cork, Ireland",
];

const ALL_LOCATIONS = [
  ...TIER1_US, ...TIER1_US,
  ...TIER2_US, ...TIER2_US, ...TIER2_US,
  ...TIER3_SUBURBS_COUNTIES,
  ...INTERNATIONAL,
];

let rotationIndex = 0;
const sentEmails = new Set<string>();
const usedCombos = new Set<string>();

function getNextNicheCity(): { niche: string; city: string } {
  const maxAttempts = NICHES.length * ALL_LOCATIONS.length;
  for (let i = 0; i < maxAttempts; i++) {
    const totalCombos = NICHES.length * ALL_LOCATIONS.length;
    const idx = rotationIndex % totalCombos;
    rotationIndex++;

    const nicheIdx = Math.floor(idx / ALL_LOCATIONS.length);
    const cityIdx = idx % ALL_LOCATIONS.length;
    const combo = `${NICHES[nicheIdx]}|${ALL_LOCATIONS[cityIdx]}`;

    if (!usedCombos.has(combo)) {
      usedCombos.add(combo);
      return { niche: NICHES[nicheIdx], city: ALL_LOCATIONS[cityIdx] };
    }
  }

  usedCombos.clear();
  return { niche: NICHES[0], city: ALL_LOCATIONS[0] };
}

function renderConfirmationPreview(businessName: string, niche: string = "auto-detailing"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, { name: string; price: string }> = {
    "auto-detailing": { name: "Interior Detail", price: "$175.00" },
    "salon": { name: "Haircut & Style", price: "$55.00" },
    "barbershop": { name: "Classic Haircut", price: "$35.00" },
    "spa": { name: "Swedish Massage", price: "$90.00" },
    "fitness": { name: "Personal Training", price: "$75.00" },
    "tattoo": { name: "Small Tattoo", price: "$100.00" },
    "massage": { name: "Deep Tissue", price: "$120.00" },
    "yoga": { name: "Yoga Class", price: "$25.00" },
    "therapy": { name: "Therapy Session", price: "$150.00" },
    "personal-trainer": { name: "PT Session", price: "$80.00" },
  };
  const service = services[niche] || services["auto-detailing"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">${upperName}</div>
        <div style="font-size: 42px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">CONFIRMED</div>
        <div style="color: #888; font-size: 14px;">Your booking has been secured</div>
      </div>
      <div style="padding: 0 32px 32px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="color: #666; font-size: 13px;">Service</span>
            <span style="color: #f5f5f7; font-size: 13px; font-weight: 600;">${service.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="color: #666; font-size: 13px;">Total</span>
            <span style="color: #f5f5f7; font-size: 13px; font-weight: 600;">${service.price}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function buildOutreachEmail(businessName: string, bookingLink: string, slug: string, niche: string): string {
  const qrImageUrl = `${DOMAIN}/api/qr/${encodeURIComponent(slug)}`;

  return `
    <div style="background-color: #000; color: #f5f5f7; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="margin-bottom: 32px; text-align: center;">
        <img src="${DOMAIN}/favicon.png" style="width: 48px; height: 48px; margin-bottom: 16px;">
        <h1 style="color: #f5f5f7; font-size: 32px; margin: 8px 0; font-family: 'Cormorant Garamond', serif;">Your Custom Booking System for ${businessName}</h1>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">Hi there,</p>
      
      <p style="font-size: 18px; line-height: 1.6; color: #f5f5f7; margin-bottom: 24px; font-weight: 600;">
        Quick question — how many bookings does ${businessName} miss each week because customers can't book instantly?
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 16px;">
        Most appointment-based businesses lose clients when:
      </p>

      <ul style="color: #ccc; padding-left: 20px; margin-bottom: 16px; line-height: 2;">
        <li>Customers call after hours</li>
        <li>Messages get missed</li>
        <li>Back-and-forth takes too long</li>
        <li>Reminders aren't automated</li>
      </ul>

      <p style="font-size: 16px; line-height: 1.6; color: #f5f5f7; margin-bottom: 24px; font-weight: 600;">
        When it's not instant, people book somewhere else.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 16px;">
        So I created a custom smart booking link and QR code specifically for <strong>${businessName}</strong>. It lets your customers:
      </p>

      <ul style="color: #ccc; padding-left: 20px; margin-bottom: 24px; line-height: 2;">
        <li>Book instantly from their phone</li>
        <li>Get automatic confirmations and reminders</li>
        <li>Avoid double bookings</li>
        <li>Secure appointments 24/7</li>
      </ul>

      <p style="font-size: 16px; line-height: 1.6; color: #ccc; margin-bottom: 24px;">
        No complicated setup. No new systems to learn. You simply share the link or display the QR code. That's it.
      </p>

      <div style="margin-bottom: 40px;">
        <div style="color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 16px;">Your Custom Booking Link</div>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: #111; padding: 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 700; line-height: 1; margin: 0; color: #f5f5f7; letter-spacing: -1px;">RESERVE<br>YOUR<br>SPACE</h2>
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
                <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 32px; color: #f5f5f7; font-size: 16px;">&#8599;</div>
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
      </div>

      <p style="font-size: 18px; line-height: 1.6; color: #f5f5f7; margin-bottom: 12px; font-weight: 600; text-align: center;">
        If one missed appointment costs you $90, this system pays for itself in days.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #888; margin-bottom: 32px; text-align: center;">
        All of this costs less than 2 cups of coffee a month.
      </p>

      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 32px; margin-bottom: 32px;">
        <p style="color: #ccc; font-size: 14px; margin-bottom: 24px;">Here's your live demo:</p>
        <a href="${bookingLink}" style="background: #f5f5f7; color: #000; padding: 18px 48px; border-radius: 100px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px;">View ${businessName} Booking Page</a>
      </div>

      <p style="font-size: 16px; color: #ccc; line-height: 1.6;">
        Would you like me to activate this for you so you can start capturing bookings right away?
      </p>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #f5f5f7; font-weight: 600; margin-bottom: 4px;">BookFlow</p>
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Smart Booking for Service Businesses</p>
      </div>
    </div>
  `;
}

async function sendOutreachEmail(lead: ProspectedLead): Promise<boolean> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.error("[OutreachCron] POSTMARK_SERVER_TOKEN not configured");
    return false;
  }

  const client = new Postmark.ServerClient(token);
  const bookingLink = `${DOMAIN}/book/${lead.slug}?niche=${encodeURIComponent(lead.niche)}`;
  const emailHtml = buildOutreachEmail(lead.businessName, bookingLink, lead.slug, lead.niche);

  try {
    await client.sendEmail({
      From: `BookFlow - ${lead.businessName} <hello@confirmbooking.online>`,
      To: lead.email,
      Subject: `How many bookings is ${lead.businessName} missing each week?`,
      HtmlBody: emailHtml,
      MessageStream: "outbound",
    });
    return true;
  } catch (err: any) {
    console.error(`[OutreachCron] Failed to send to ${lead.email}:`, err.message);
    return false;
  }
}

export async function runKimiProspecting(niche: string, city: string): Promise<ProspectedLead[]> {
  console.log(`[OutreachCron] Prospecting ${niche} businesses in ${city}...`);
  try {
    const leads = await prospectLeads(niche, city, 20);
    const filtered = leads.filter(l => l.email.endsWith("@gmail.com") && !sentEmails.has(l.email));
    console.log(`[OutreachCron] Found ${leads.length} leads, ${filtered.length} new Gmail leads`);
    return filtered;
  } catch (err: any) {
    console.error("[OutreachCron] Prospecting failed:", err.message);
    return [];
  }
}

export async function runDailyOutreach(): Promise<{ sent: number; failed: number; niche: string; city: string }> {
  const { niche, city } = getNextNicheCity();
  console.log(`[OutreachCron] === Daily Outreach Starting === Niche: ${niche}, City: ${city}`);

  const leads = await runKimiProspecting(niche, city);
  if (leads.length === 0) {
    console.log("[OutreachCron] No leads to process, skipping.");
    return { sent: 0, failed: 0, niche, city };
  }

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    if (sentEmails.has(lead.email)) continue;

    const success = await sendOutreachEmail(lead);
    if (success) {
      sent++;
      sentEmails.add(lead.email);
      console.log(`[OutreachCron] Sent to ${lead.businessName} (${lead.email})`);
    } else {
      failed++;
    }

    if (sent + failed < leads.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[OutreachCron] === Complete === Sent: ${sent}, Failed: ${failed}, Niche: ${niche}, City: ${city}`);
  return { sent, failed, niche, city };
}

export function getOutreachStats() {
  const next = getNextNicheCity();
  rotationIndex--;
  usedCombos.delete(`${next.niche}|${next.city}`);
  return {
    totalSent: sentEmails.size,
    rotationIndex,
    totalLocations: ALL_LOCATIONS.length,
    totalNiches: NICHES.length,
    totalCombos: NICHES.length * ALL_LOCATIONS.length,
    usedCombos: usedCombos.size,
    nextCombo: next,
  };
}
