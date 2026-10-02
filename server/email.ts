import * as postmark from 'postmark';

function getPostmarkClient(): postmark.ServerClient | null {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  console.log('[Postmark] Checking Server Token configuration...');
  if (!serverToken) {
    console.error('[Postmark] Server Token is MISSING from environment variables.');
    return null;
  }
  console.log('[Postmark] Server Token found, initializing client.');
  return new postmark.ServerClient(serverToken);
}

interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  confirmationNumber: string;
  businessName: string;
  currency?: string;
  isReminder?: boolean;
  hoursToGo?: number;
  businessWebsite?: string;
  businessPhone?: string;
  addons?: { name: string; price: number | string }[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", JPY: "¥", INR: "₹", ZAR: "R", NGN: "₦", KES: "KSh",
};

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || "$";
}

export function isBlockedBookingRecipient(email: string): boolean {
  const normalized = email.toLowerCase();
  return normalized.endsWith('@internal.bookflow.app')
    || normalized.endsWith('@example.com')
    || normalized.includes('@resend.dev');
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
  const client = getPostmarkClient();
  if (!client) {
    console.log('[Postmark] Client not initialized, skipping email');
    return false;
  }

  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    // PROTECT DOMAIN REPUTATION: 
    // We block internal dummy domains, example.com, and resend.dev test emails.
    if (isBlockedBookingRecipient(data.customerEmail)) {
      console.log(`[Postmark] BLOCKING delivery to test/example address: ${data.customerEmail}`);
      return true; // Skip actual sending
    }

    console.log(`[Postmark] Attempting to send live email to: ${data.customerEmail}`);

    const isReminder = data.isReminder || false;
    const title = isReminder ? "Viewing Reminder" : "Viewing Confirmed";
    const subtitle = isReminder 
      ? `Your property viewing is ${data.hoursToGo ? `in ${data.hoursToGo} hours` : 'coming up soon'}`
      : "Your property viewing has been confirmed";
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; color: #1C1410; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF7F2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #FFFFFF; border: 1px solid #E8DDD0; border-radius: 24px; overflow: hidden;">
          
          <!-- Header Section -->
          <tr>
            <td style="padding: 48px 32px 32px; text-align: center; background-color: #FFF8F0;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 4px; color: #C17F3E; margin-bottom: 12px;">${data.businessName}</div>
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; font-weight: 700; letter-spacing: -1px; color: #1C1410; line-height: 1.2;">${title}</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #6B5744;">${subtitle}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #FFFFFF;">
              <p style="margin: 0; font-size: 18px; color: #1C1410;">Hi ${data.customerName},</p>
            </td>
          </tr>
          
          <!-- Booking Details Card -->
          <tr>
            <td style="padding: 0 32px 32px; background-color: #FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF7F2; border: 1px solid #E8DDD0; border-radius: 20px;">
                
                <!-- Confirmation -->
                <tr>
                  <td style="padding: 20px 24px 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">Confirmation</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #C17F3E; font-family: 'SF Mono', Monaco, monospace;">${data.confirmationNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Service -->
                <tr>
                  <td style="padding: 12px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">Viewing</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #1C1410;">${data.serviceName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${data.addons && data.addons.length > 0 ? data.addons.map(addon => {
                  const displayPrice = typeof addon.price === 'number' 
                    ? (addon.price / 100).toFixed(2) 
                    : (parseFloat(addon.price) / 100).toFixed(2);
                  return `
                <!-- Add-on -->
                <tr>
                  <td style="padding: 4px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">+ ${addon.name}</td>
                        <td style="text-align: right; font-size: 13px; font-weight: 500; color: #6B5744;">${getCurrencySymbol(data.currency || "USD")}${displayPrice}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `; }).join('') : ''}
                
                <!-- Date -->
                <tr>
                  <td style="padding: 12px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">Date</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #1C1410;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Time -->
                <tr>
                  <td style="padding: 12px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">Time</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #1C1410;">${data.time}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 8px 24px;">
                    <div style="height: 1px; background: #E8DDD0;"></div>
                  </td>
                </tr>
                
                <!-- Total -->
                <tr>
                  <td style="padding: 12px 24px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6F47;">Total</td>
                        <td style="text-align: right; font-size: 22px; font-weight: 700; color: #1C1410;">${getCurrencySymbol(data.currency || "USD")}${((data.price || 0) / 100).toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Channel updates -->
          <tr>
            <td style="padding: 0 24px 24px; text-align: center; background-color: #FFFFFF;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #6B5744;">You'll also receive updates via</p>
              <span style="display: inline-block; padding: 7px 10px; border-radius: 100px; border: 1px solid #E8DDD0; background-color: #FFF8F0; color: #C17F3E; font-size: 12px;">📱 SMS</span>
              <span style="color: #C17F3E;"> · </span>
              <span style="display: inline-block; padding: 7px 10px; border-radius: 100px; border: 1px solid #E8DDD0; background-color: #FFF8F0; color: #C17F3E; font-size: 12px;">📞 Call</span>
              <span style="color: #C17F3E;"> · </span>
              <span style="display: inline-block; padding: 7px 10px; border-radius: 100px; border: 1px solid #E8DDD0; background-color: #FFF8F0; color: #C17F3E; font-size: 12px;">💬 Chat</span>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding: 0 32px 24px; background-color: #FFFFFF;">
              <p style="margin: 0; font-size: 13px; text-align: center; color: #6B5744; font-style: italic; line-height: 1.6;">
                Need to reschedule your viewing? Contact ${data.businessName} directly${data.businessPhone ? ` at <span style="color: #6B5744; font-style: normal;">${data.businessPhone}</span>` : ''}${data.businessWebsite ? `${data.businessPhone ? ' or' : ''} visit <a href="${data.businessWebsite.startsWith('http') ? data.businessWebsite : `https://${data.businessWebsite}`}" style="color: #6B5744; text-decoration: underline; font-style: normal;">${data.businessWebsite.replace(/^https?:\/\//, '')}</a>` : ''}.
              </p>
            </td>
          </tr>
          
          <!-- Branding -->
          <tr>
            <td style="padding: 24px 32px 32px; background-color: #FFFFFF; border-top: 1px solid #E8DDD0;">
              <p style="margin: 0; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 4px; color: #C17F3E;">
                <a href="https://bookflowx.cerolauto.store" style="color: #C17F3E; text-decoration: none;">Powered by BookFlow</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const subject = isReminder 
      ? `Reminder: Your viewing with ${data.businessName} is coming up`
      : `Property Viewing Confirmed — ${data.businessName}`;

    await client.sendEmail({
      From: `${data.businessName} via BookFlow <bookings@confirmbooking.online>`,
      To: data.customerEmail,
      Subject: subject,
      HtmlBody: html,
      MessageStream: "outbound"
    });

    console.log(`[Postmark] Email sent successfully to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error('[Postmark] Exception:', error);
    return false;
  }
}
