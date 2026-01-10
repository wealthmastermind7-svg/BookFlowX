import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
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
    console.log('RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const { error, data: resendData } = await resend.emails.send({
      from: 'BookFlow <bookings@confirmbooking.online>',
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
            <p style="margin: 10px 0 0 0;"><strong>Total Price:</strong> $${data.price}</p>
          </div>
          
          <p>If you need to make any changes, please contact the business directly.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Sent via BookFlow</p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending email:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('Booking confirmation email sent successfully:', JSON.stringify(resendData, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
    return false;
  }
}
