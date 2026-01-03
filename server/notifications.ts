import { storage } from './storage';

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(
  businessId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  return { success: true, sentCount: 0, errors: [] };
}

export async function sendBookingNotification(
  businessId: string,
  customerName: string,
  serviceName: string,
  date: string,
  time: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const title = 'New Booking';
  const body = `${customerName} booked ${serviceName} for ${date} at ${time}`;
  
  return sendPushNotification(businessId, title, body, {
    type: 'new_booking',
    customerName,
    serviceName,
    date,
    time,
  });
}

export async function sendBookingConfirmedNotification(
  businessId: string,
  customerName: string,
  serviceName: string,
  date: string,
  time: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const title = 'Booking Confirmed';
  const body = `${customerName}'s ${serviceName} on ${date} at ${time} has been confirmed`;
  
  return sendPushNotification(businessId, title, body, {
    type: 'booking_confirmed',
    customerName,
    serviceName,
    date,
    time,
  });
}

export async function sendBookingCancelledNotification(
  businessId: string,
  customerName: string,
  serviceName: string,
  date: string,
  time: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const title = 'Booking Cancelled';
  const body = `${customerName}'s ${serviceName} on ${date} at ${time} has been cancelled`;
  
  return sendPushNotification(businessId, title, body, {
    type: 'booking_cancelled',
    customerName,
    serviceName,
    date,
    time,
  });
}

export async function sendReminderNotification(
  businessId: string,
  customerName: string,
  serviceName: string,
  time: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const title = 'Upcoming Appointment';
  const body = `Reminder: ${customerName} has ${serviceName} at ${time} today`;
  
  return sendPushNotification(businessId, title, body, {
    type: 'reminder',
    customerName,
    serviceName,
    time,
  });
}

export async function sendTestNotification(
  businessId: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const title = 'Test Notification';
  const body = 'This is a test notification from BookFlow. If you received this, push notifications are working correctly!';
  
  return sendPushNotification(businessId, title, body, {
    type: 'test',
  });
}
