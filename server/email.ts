import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  console.log('[Resend] Checking API Key configuration...');
  if (!apiKey) {
    console.error('[Resend] API Key is MISSING from environment variables.');
    return null;
  }
  console.log('[Resend] API Key found, initializing client.');
  return new Resend(apiKey);
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
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  INR: "₹",
  ZAR: "R",
  NGN: "₦",
  KES: "KSh",
};

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || "$";
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Resend] Client not initialized, skipping email');
    return false;
  }

  console.log(`[Resend] Preparing email for ${data.customerEmail} from bookings@confirmbooking.online`);
  
  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const response = await resend.emails.send({
      from: `${data.businessName} <bookings@confirmbooking.online>`,
      to: data.customerEmail,
      subject: `Booking Confirmed - ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmed</title>
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
        .container { width: 100%; max-width: 430px; margin: 0 auto; background-color: #000000; overflow: hidden; }
        .header { padding: 40px 24px; position: relative; }
        .status-label { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .title { font-size: 64px; font-weight: 800; letter-spacing: -2px; line-height: 0.9; margin: 0; color: #ffffff; text-shadow: 0 0 20px rgba(255,255,255,0.3); }
        .content { padding: 0 24px 40px; }
        .greeting { font-size: 20px; font-weight: 300; color: rgba(255,255,255,0.9); margin-bottom: 8px; }
        .greeting strong { font-weight: 600; }
        .message { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 32px; }
        .message strong { color: #ffffff; }
        .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 24px; }
        .detail-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .detail-label-container { display: flex; align-items: center; }
        .detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4); }
        .detail-value { font-size: 14px; font-weight: 600; color: #ffffff; letter-spacing: 1px; }
        .divider { height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0 20px; }
        .total-price { font-size: 20px; font-weight: 700; color: #ffffff; }
        .button { display: block; width: 100%; background-color: #E5E7EB; color: #000000; text-align: center; padding: 18px 0; border-radius: 16px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; margin-top: 32px; }
        .footer-note { font-size: 11px; text-align: center; color: rgba(255,255,255,0.4); font-style: italic; line-height: 1.6; margin-top: 40px; }
        .branding { text-align: center; margin-top: 40px; padding-bottom: 24px; }
        .branding-text { font-size: 9px; text-transform: uppercase; letter-spacing: 5px; color: rgba(255,255,255,0.3); font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-label">Booking Status</div>
            <h1 class="title">CONFIRMED</h1>
        </div>
        <div class="content">
            <div class="greeting">Hi <strong>${data.customerName}</strong>,</div>
            <div class="message">Your appointment with <strong>${data.businessName}</strong> has been successfully secured and added to our schedule.</div>
            
            <div class="glass-card">
                <div class="detail-row">
                    <span class="detail-label">Confirmation</span>
                    <span class="detail-value">${data.confirmationNumber.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Service</span>
                    <span class="detail-value">${data.serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${data.time}</span>
                </div>
                <div class="divider"></div>
                <div class="detail-row" style="margin-bottom: 0;">
                    <span class="detail-label">Total</span>
                    <span class="total-price">${getCurrencySymbol(data.currency || "USD")}${(data.price / 100).toFixed(2)}</span>
                </div>
            </div>

            <p class="footer-note">If you need to make any changes, please<br>contact the business directly.</p>
            
            <div class="branding">
                <span class="branding-text">Sent via BookFlow</span>
            </div>
        </div>
    </div>
</body>
</html>
      `
    });

    if (response.error) {
      console.error('[Resend] API Error:', JSON.stringify(response.error, null, 2));
      return false;
    }

    console.log('[Resend] Success! ID:', response.data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception:', error);
    return false;
  }
}

export async function sendBookingReminder(data: BookingConfirmationData): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    const response = await resend.emails.send({
      from: `${data.businessName} <bookings@confirmbooking.online>`,
      to: data.customerEmail,
      subject: `Reminder: Booking with ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Reminder</title>
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
        .container { width: 100%; max-width: 430px; margin: 0 auto; background-color: #000000; overflow: hidden; position: relative; }
        .header { padding: 64px 32px 48px; }
        .status-label { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.5); margin-bottom: 16px; }
        .title { font-size: 72px; font-weight: 300; letter-spacing: -3px; font-style: italic; margin: 0; color: #ffffff; text-shadow: 0 0 20px rgba(255,255,255,0.3); }
        .countdown-container { text-align: center; margin-bottom: 48px; }
        .countdown-circle { display: inline-block; width: 192px; height: 192px; border: 2px solid rgba(255,255,255,0.05); border-radius: 96px; position: relative; }
        .countdown-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; }
        .countdown-number { display: block; font-size: 40px; font-weight: 200; color: #ffffff; letter-spacing: -1px; }
        .countdown-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4); margin-top: 4px; }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; padding: 32px; margin: 0 32px 48px; }
        .guest-section { margin-bottom: 32px; }
        .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4); font-weight: 500; margin-bottom: 4px; display: block; }
        .guest-name { font-size: 20px; font-weight: 200; color: #ffffff; }
        .grid-row { display: table; width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .grid-cell { display: table-cell; width: 50%; }
        .detail-value { font-size: 14px; font-weight: 500; color: #ffffff; }
        .footer-details { padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
        .footer-row { display: table; width: 100%; }
        .footer-cell { display: table-cell; vertical-align: middle; }
        .footer-value { font-size: 12px; color: #ffffff; margin: 0; }
        .footer-sub { font-size: 10px; color: rgba(255,255,255,0.4); margin: 2px 0 0 0; }
        .button { display: block; width: calc(100% - 64px); margin: 0 32px 24px; background: linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #b8b8b8 100%); color: #000000; text-align: center; padding: 16px 0; border-radius: 100px; font-weight: 500; font-size: 14px; letter-spacing: 1px; text-decoration: none; }
        .concierge-note { font-size: 11px; text-align: center; color: rgba(255,255,255,0.3); line-height: 1.6; max-width: 240px; margin: 0 auto 48px; }
        .branding { text-align: center; padding-bottom: 24px; opacity: 0.2; }
        .branding-text { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #ffffff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-label">${data.businessName.toUpperCase()} • APPOINTMENT</div>
            <h1 class="title">Reminder</h1>
        </div>

        <div class="countdown-container">
            <div class="countdown-circle">
                <div class="countdown-content">
                    <span class="countdown-number">24</span>
                    <span class="countdown-label">Hours To Go</span>
                </div>
            </div>
        </div>

        <div class="glass-card">
            <div class="guest-section">
                <span class="section-label">Guest</span>
                <span class="guest-name">${data.customerName}</span>
            </div>
            
            <div class="grid-row">
                <div class="grid-cell">
                    <span class="section-label">Service</span>
                    <span class="detail-value">${data.serviceName}</span>
                </div>
                <div class="grid-cell">
                    <span class="section-label">Total</span>
                    <span class="detail-value">${getCurrencySymbol(data.currency || "USD")}${(data.price / 100).toFixed(2)}</span>
                </div>
            </div>

            <div class="footer-details">
                <div class="footer-row">
                    <div class="footer-cell">
                        <p class="footer-value">${formattedDate}</p>
                        <p class="footer-sub">${data.time}</p>
                    </div>
                    <div class="footer-cell" style="text-align: right;">
                        <p class="footer-value">${data.confirmationNumber.toUpperCase()}</p>
                        <p class="footer-sub">Conf. Code</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="concierge-note">Should your plans change, please contact our concierge directly to adjust your schedule.</div>
        
        <div class="branding">
            <span class="branding-text">Sent via BookFlow</span>
        </div>
    </div>
</body>
</html>
      `
    });

    return !response.error;
  } catch (error) {
    console.error('[Resend] Reminder Exception:', error);
    return false;
  }
}
