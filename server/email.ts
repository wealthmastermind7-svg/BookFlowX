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
  isReminder?: boolean;
  hoursToGo?: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", JPY: "¥", INR: "₹", ZAR: "R", NGN: "₦", KES: "KSh",
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

  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const isReminder = data.isReminder || false;
    const title = isReminder ? "Reminder" : "CONFIRMED";
    const statusLabel = isReminder ? `${data.businessName} • Appointment` : "Booking Status";
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background-color: #000000; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff; }
  .container { max-width: 400px; margin: 0 auto; background-color: #000000; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
  .header-img { width: 100%; height: 240px; background-color: #111; position: relative; }
  .header-img img { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
  .header-overlay { position: absolute; bottom: 0; left: 0; width: 100%; padding: 40px 30px; background: linear-gradient(to top, #000, transparent); box-sizing: border-box; }
  .status-label { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
  .title { font-size: 56px; font-weight: 800; letter-spacing: -2px; margin: 0; line-height: 0.9; color: #ffffff; }
  .content { padding: 30px; }
  .greeting { font-size: 18px; font-weight: 300; margin-bottom: 8px; }
  .intro { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 32px; }
  .glass-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 24px; margin-bottom: 32px; }
  .info-row { display: table; width: 100%; margin-bottom: 16px; }
  .info-label { display: table-cell; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4); vertical-align: middle; }
  .info-value { display: table-cell; text-align: right; font-size: 14px; font-weight: 600; color: #ffffff; vertical-align: middle; }
  .divider { height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0 16px; }
  .total-row .info-value { font-size: 20px; font-weight: 700; }
  .button { display: block; width: 100%; background: #E5E7EB; color: #000000; text-align: center; padding: 18px 0; border-radius: 16px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; margin-bottom: 40px; }
  .footer-note { font-size: 11px; text-align: center; color: rgba(255,255,255,0.4); font-style: italic; line-height: 1.8; margin-bottom: 40px; }
  .branding { font-size: 9px; text-align: center; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.2); }
</style>
</head>
<body>
  <div class="container">
    <div class="header-img">
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600" alt="Cinematic Abstract">
      <div class="header-overlay">
        <div class="status-label">${statusLabel}</div>
        <h1 class="title">${title}</h1>
      </div>
    </div>
    <div class="content">
      <div class="greeting">Hi <strong>${data.customerName}</strong>,</div>
      <p class="intro">
        ${isReminder 
          ? `Your appointment with <strong>${data.businessName}</strong> is coming up soon.`
          : `Your appointment with <strong>${data.businessName}</strong> has been successfully secured and added to our schedule.`}
      </p>
      
      <div class="glass-card">
        <div class="info-row">
          <div class="info-label">Confirmation</div>
          <div class="info-value">${data.confirmationNumber}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Service</div>
          <div class="info-value">${data.serviceName}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Date</div>
          <div class="info-value">${formattedDate}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Time</div>
          <div class="info-value">${data.time}</div>
        </div>
        <div class="divider"></div>
        <div class="info-row total-row">
          <div class="info-label">Total</div>
          <div class="info-value">${getCurrencySymbol(data.currency || "USD")}${((data.price || 0) / 100).toFixed(2)}</div>
        </div>
      </div>

      <a href="#" class="button">View Appointment</a>

      <p class="footer-note">
        If you need to make any changes, please<br>contact the business directly.
      </p>

      <div class="branding">Sent via BookFlow</div>
    </div>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: `${data.businessName} <bookings@confirmbooking.online>`,
      to: data.customerEmail,
      subject: isReminder ? `Reminder: ${data.serviceName} with ${data.businessName}` : `Booking Confirmed - ${data.businessName}`,
      html
    });

    return true;
  } catch (error) {
    console.error('[Resend] Exception:', error);
    return false;
  }
}
