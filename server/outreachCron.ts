import Postmark from "postmark";
import { getCustomerBookingUrl } from "@shared/booking-links";
import * as net from "net";
import * as dns from "dns";
import { promisify } from "util";
import { prospectLeads, ProspectedLead } from "./kimiClaw";

const resolveMx = promisify(dns.resolveMx);

async function verifyEmailExists(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return false;

    mxRecords.sort((a, b) => a.priority - b.priority);
    const mxHost = mxRecords[0].exchange;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let step = 0;
      let response = "";
      const timeout = setTimeout(() => { socket.destroy(); resolve(false); }, 10000);

      socket.connect(25, mxHost, () => {});

      socket.on("data", (data) => {
        response = data.toString();
        const code = parseInt(response.substring(0, 3));

        if (step === 0 && code === 220) {
          socket.write(`EHLO confirmbooking.online\r\n`);
          step = 1;
        } else if (step === 1 && code === 250) {
          socket.write(`MAIL FROM:<verify@confirmbooking.online>\r\n`);
          step = 2;
        } else if (step === 2 && code === 250) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step = 3;
        } else if (step === 3) {
          socket.write("QUIT\r\n");
          clearTimeout(timeout);
          socket.destroy();
          resolve(code === 250);
        } else if (code >= 500) {
          clearTimeout(timeout);
          socket.destroy();
          resolve(false);
        }
      });

      socket.on("error", () => { clearTimeout(timeout); resolve(false); });
      socket.on("timeout", () => { clearTimeout(timeout); socket.destroy(); resolve(false); });
      socket.setTimeout(10000);
    });
  } catch {
    return false;
  }
}

const verifiedEmails = new Map<string, boolean>();

async function isEmailValid(email: string): Promise<boolean> {
  if (verifiedEmails.has(email)) return verifiedEmails.get(email)!;

  const basicPattern = /^[a-zA-Z0-9._-]+@gmail\.com$/;
  if (!basicPattern.test(email)) {
    verifiedEmails.set(email, false);
    return false;
  }

  const localPart = email.split("@")[0];
  if (localPart.length < 3 || localPart.length > 30) {
    verifiedEmails.set(email, false);
    return false;
  }

  if (/^(test|example|demo|fake|noreply|admin|info|hello|contact)/.test(localPart)) {
    verifiedEmails.set(email, false);
    return false;
  }

  const valid = await verifyEmailExists(email);
  verifiedEmails.set(email, valid);
  console.log(`[OutreachCron] Email verify: ${email} → ${valid ? "EXISTS" : "INVALID"}`);
  return valid;
}

const DOMAIN = "https://confirmbooking.online";

const NICHES = [
  "real-estate-agents", "property-managers", "rental-agencies",
  "landlords", "buyers-agents"
];

const ALL_LOCATIONS = [
  "Auckland, New Zealand", "Sydney, Australia", "Melbourne, Australia",
  "Brisbane, Australia", "London, UK", "Toronto, Canada",
  "Vancouver, Canada", "Dubai, UAE",
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

function renderConfirmationPreview(businessName: string, niche: string = "real-estate-agents"): string {
  const upperName = businessName.toUpperCase();
  const services: Record<string, string> = {
    "real-estate-agents": "Property Viewing",
    "property-managers": "Rental Inspection",
    "rental-agencies": "Open Home",
    "landlords": "Rental Inspection",
    "buyers-agents": "Property Viewing",
  };
  const service = services[niche] || services["real-estate-agents"];

  return `
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #000 40%, #000 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); max-width: 400px; margin: 0 auto;">
      <div style="padding: 40px 32px 24px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">${upperName}</div>
        <div style="font-size: 36px; font-weight: 800; color: #f5f5f7; letter-spacing: -1px; margin-bottom: 12px;">VIEWING CONFIRMED</div>
        <div style="color: #888; font-size: 14px;">Your property appointment is booked</div>
      </div>
      <div style="padding: 0 32px 32px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="color: #666; font-size: 13px;">Viewing type</span>
            <span style="color: #f5f5f7; font-size: 13px; font-weight: 600;">${service}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="color: #666; font-size: 13px;">Status</span>
            <span style="color: #00d4ff; font-size: 13px; font-weight: 600;">Viewing Confirmed</span>
          </div>
        </div>
      </div>
    </div>`;
}

function buildOutreachEmail(businessName: string, bookingLink: string, slug: string, niche: string): string {
  const qrImageUrl = `${DOMAIN}/api/qr/${encodeURIComponent(slug)}?destination=canvas`;

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
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 700; line-height: 1; margin: 0; color: #f5f5f7; letter-spacing: -1px;">BOOK A<br>PROPERTY<br>VIEWING</h2>
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
                <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 32px; color: #f5f5f7; font-size: 16px;">&#8599;</div>
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
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Smart Booking for Property Professionals</p>
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
  const bookingLink = `${getCustomerBookingUrl(lead.slug)}?niche=${encodeURIComponent(lead.niche)}`;
  const emailHtml = buildOutreachEmail(lead.businessName, bookingLink, lead.slug, lead.niche);

  try {
    await client.sendEmail({
      From: `BookFlow - ${lead.businessName} <hello@confirmbooking.online>`,
      To: lead.email,
      Subject: `How many property viewings is ${lead.businessName} missing each week?`,
      HtmlBody: emailHtml,
      MessageStream: "outbound",
    });
    return true;
  } catch (err: any) {
    console.error(`[OutreachCron] Failed to send to ${lead.email}:`, err.message);
    return false;
  }
}

export async function runKimiProspecting(niche: string, city: string, verify = true): Promise<ProspectedLead[]> {
  console.log(`[OutreachCron] Prospecting ${niche} businesses in ${city}...`);
  try {
    const leads = await prospectLeads(niche, city, 5);
    const gmailOnly = leads.filter(l => l.email.endsWith("@gmail.com") && !sentEmails.has(l.email));
    console.log(`[OutreachCron] Found ${leads.length} leads, ${gmailOnly.length} new Gmail leads`);

    if (!verify) return gmailOnly;

    console.log(`[OutreachCron] Verifying ${gmailOnly.length} emails via SMTP...`);
    const verified: ProspectedLead[] = [];
    let invalid = 0;

    for (const lead of gmailOnly) {
      const valid = await isEmailValid(lead.email);
      if (valid) {
        verified.push(lead);
      } else {
        invalid++;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[OutreachCron] Verification complete: ${verified.length} valid, ${invalid} invalid`);
    return verified;
  } catch (err: any) {
    console.error("[OutreachCron] Prospecting failed:", err.message);
    return [];
  }
}

export async function runDailyOutreach(): Promise<{ sent: number; failed: number; niche: string; city: string; leads?: Array<ProspectedLead & { _sent: boolean }> }> {
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
  return { sent, failed, niche, city, leads: leads.map(l => ({ ...l, _sent: true })) };
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
