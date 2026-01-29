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
    const isInternalDemo = data.customerEmail.toLowerCase().endsWith('@internal.bookflow.app');
    const isExampleDomain = data.customerEmail.toLowerCase().endsWith('@example.com');
    const isResendDev = data.customerEmail.toLowerCase().includes('@resend.dev');

    if (isInternalDemo || isExampleDomain || isResendDev) {
      console.log(`[Postmark] BLOCKING delivery to test/example address: ${data.customerEmail}`);
      return true; // Skip actual sending
    }

    console.log(`[Postmark] Attempting to send live email to: ${data.customerEmail}`);

    const isReminder = data.isReminder || false;
    const title = isReminder ? "REMINDER" : "CONFIRMED";
    const subtitle = isReminder 
      ? `Your appointment is ${data.hoursToGo ? `in ${data.hoursToGo} hours` : 'coming up soon'}`
      : "Your booking has been secured";
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking ${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #000000; border-radius: 24px; overflow: hidden;">
          
          <!-- Header Section -->
          <tr>
            <td style="padding: 48px 32px 32px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.5); margin-bottom: 12px;">${data.businessName}</div>
              <h1 style="margin: 0; font-size: 48px; font-weight: 700; letter-spacing: -2px; color: #ffffff; line-height: 1;">${title}</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: rgba(255,255,255,0.6); font-weight: 300;">${subtitle}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #000000;">
              <p style="margin: 0; font-size: 18px; color: rgba(255,255,255,0.9); font-weight: 300;">Hi ${data.customerName},</p>
            </td>
          </tr>
          
          <!-- Booking Details Card -->
          <tr>
            <td style="padding: 0 32px 32px; background-color: #000000;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
                
                <!-- Confirmation -->
                <tr>
                  <td style="padding: 20px 24px 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4);">Confirmation</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #ffffff; font-family: 'SF Mono', Monaco, monospace;">${data.confirmationNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Service -->
                <tr>
                  <td style="padding: 12px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4);">Service</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #ffffff;">${data.serviceName}</td>
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
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.3);">+ ${addon.name}</td>
                        <td style="text-align: right; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7);">${getCurrencySymbol(data.currency || "USD")}${displayPrice}</td>
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
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4);">Date</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #ffffff;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Time -->
                <tr>
                  <td style="padding: 12px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4);">Time</td>
                        <td style="text-align: right; font-size: 15px; font-weight: 600; color: #ffffff;">${data.time}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 8px 24px;">
                    <div style="height: 1px; background: rgba(255,255,255,0.08);"></div>
                  </td>
                </tr>
                
                <!-- Total -->
                <tr>
                  <td style="padding: 12px 24px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4);">Total</td>
                        <td style="text-align: right; font-size: 22px; font-weight: 700; color: #ffffff;">${getCurrencySymbol(data.currency || "USD")}${((data.price || 0) / 100).toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer Note -->
          <tr>
            <td style="padding: 0 32px 24px; background-color: #000000;">
              <p style="margin: 0; font-size: 13px; text-align: center; color: rgba(255,255,255,0.4); font-style: italic; line-height: 1.6;">
                Need to reschedule? Contact ${data.businessName} directly${data.businessPhone ? ` at <span style="color: rgba(255,255,255,0.6); font-style: normal;">${data.businessPhone}</span>` : ''}${data.businessWebsite ? `${data.businessPhone ? ' or' : ''} visit <a href="${data.businessWebsite.startsWith('http') ? data.businessWebsite : `https://${data.businessWebsite}`}" style="color: rgba(255,255,255,0.6); text-decoration: underline; font-style: normal;">${data.businessWebsite.replace(/^https?:\/\//, '')}</a>` : ''}.
              </p>
            </td>
          </tr>
          
          <!-- Branding -->
          <tr>
            <td style="padding: 24px 32px 32px; background-color: #000000; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="margin: 0; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.2);">
                <a href="https://confirmbooking.online/" style="color: rgba(255,255,255,0.4); text-decoration: none;">Powered by BookFlow</a>
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
      ? `Reminder: ${data.serviceName} - ${formattedDate}` 
      : `Booking Confirmed - ${data.businessName}`;

    await client.sendEmail({
      From: "BookFlow <bookings@confirmbooking.online>",
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
