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
      from: 'BookFlow <onboarding@resend.dev>',
      to: data.customerEmail,
      subject: `Booking Confirmed - ${data.businessName}`,
      html: `...` // html content
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
