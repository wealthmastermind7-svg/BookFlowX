/**
 * Google Calendar Integration for BookFlow
 * Uses Replit's Google Calendar connector for OAuth management
 * 
 * Features:
 * - Push bookings to Google Calendar
 * - Check free/busy times to prevent double-booking
 */

import { google, calendar_v3 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Google Calendar connector not configured');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || 
                     connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client - access tokens expire
async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Check if Google Calendar is connected and available
 */
export async function isGoogleCalendarConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get busy times from Google Calendar for a specific date range
 * Used to prevent double-booking when voice agent checks availability
 */
export async function getGoogleBusyTimes(
  startDate: string,
  endDate: string,
  timeZone: string = 'Pacific/Auckland'
): Promise<{ start: string; end: string }[]> {
  try {
    const calendar = await getCalendarClient();
    
    // First get the primary calendar ID
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || 
                           calendarList.data.items?.[0];
    
    if (!primaryCalendar?.id) {
      console.log('[GoogleCal] No calendar found');
      return [];
    }

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(startDate + 'T00:00:00').toISOString(),
        timeMax: new Date(endDate + 'T23:59:59').toISOString(),
        timeZone,
        items: [{ id: primaryCalendar.id }]
      }
    });

    const busyTimes = response.data.calendars?.[primaryCalendar.id]?.busy || [];
    
    console.log(`[GoogleCal] Found ${busyTimes.length} busy blocks for ${startDate}`);
    
    return busyTimes.map(block => ({
      start: block.start || '',
      end: block.end || ''
    }));
  } catch (error: any) {
    console.error('[GoogleCal] Error fetching busy times:', error.message);
    return [];
  }
}

/**
 * Push a booking to Google Calendar
 * Called after create_booking succeeds
 */
export async function pushBookingToGoogleCalendar(booking: {
  id: string;
  businessName: string;
  serviceName: string;
  customerName: string;
  customerEmail?: string;
  date: string;
  time: string;
  duration: number;
  totalPrice?: number;
}): Promise<string | null> {
  try {
    const calendar = await getCalendarClient();
    
    // Calculate end time
    const [hours, minutes] = booking.time.split(':').map(Number);
    const startDateTime = new Date(`${booking.date}T${booking.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + booking.duration * 60 * 1000);
    
    const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

    const event: calendar_v3.Schema$Event = {
      summary: `${booking.serviceName} - ${booking.customerName}`,
      description: `Booked via BookFlow Voice Assistant\n\nCustomer: ${booking.customerName}\nEmail: ${booking.customerEmail || 'N/A'}\nService: ${booking.serviceName}\nPrice: $${((booking.totalPrice || 0) / 100).toFixed(2)}\nBooking ID: ${booking.id.substring(0, 8).toUpperCase()}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Pacific/Auckland'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Pacific/Auckland'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });

    console.log(`[GoogleCal] Event created: ${response.data.id}`);
    return response.data.id || null;
  } catch (error: any) {
    console.error('[GoogleCal] Error creating event:', error.message);
    return null;
  }
}

/**
 * Delete an event from Google Calendar (for cancelled bookings)
 */
export async function deleteGoogleCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
    console.log(`[GoogleCal] Event deleted: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error('[GoogleCal] Error deleting event:', error.message);
    return false;
  }
}

/**
 * Filter out slots that conflict with Google Calendar busy times
 */
export function filterSlotsWithGoogleBusy(
  slots: string[],
  date: string,
  busyTimes: { start: string; end: string }[],
  slotDurationMinutes: number = 30
): string[] {
  if (busyTimes.length === 0) return slots;
  
  return slots.filter(slot => {
    const [slotH, slotM] = slot.split(':').map(Number);
    const slotStart = new Date(`${date}T${slot}:00`);
    const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);
    
    // Check if this slot overlaps with any busy time
    const hasConflict = busyTimes.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      
      // Overlap check: slot starts before busy ends AND slot ends after busy starts
      return slotStart < busyEnd && slotEnd > busyStart;
    });
    
    return !hasConflict;
  });
}
