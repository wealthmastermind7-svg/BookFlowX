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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #000; margin-top: 0;">Booking Confirmed!</h2>
          <p>Hi ${data.customerName},</p>
          <p>Your booking with <strong>${data.businessName}</strong> has been successfully confirmed.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Confirmation #:</strong> ${data.confirmationNumber}</p>
            <p style="margin: 10px 0 0 0;"><strong>Service:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="margin: 10px 0 0 0;"><strong>Total Price:</strong> $${(data.price / 100).toFixed(2)}</p>
          </div>
          
          <p>If you need to make any changes, please contact the business directly.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Sent via BookFlow</p>
        </div>
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
