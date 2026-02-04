/**
 * Google Calendar Integration for BookFlow (Multi-Tenant)
 * 
 * Architecture:
 * 1. Per-business OAuth tokens stored in database (preferred for multi-tenant)
 * 2. Fallback to Replit's Google Calendar connector (single-tenant/demo mode)
 * 
 * Features:
 * - Push bookings to Google Calendar
 * - Check free/busy times to prevent double-booking
 * - Per-business calendar isolation
 */

import { google, calendar_v3 } from 'googleapis';
import { db } from './db';
import { googleCalendarTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://bookflowx.repl.co'}/api/google-calendar/callback`;

let replitConnectionSettings: any;

/**
 * Get OAuth2 client for a specific business (per-business tokens)
 */
async function getBusinessCalendarClient(businessId: string): Promise<calendar_v3.Calendar | null> {
  try {
    const [token] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.businessId, businessId))
      .limit(1);

    if (!token) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt.getTime(),
    });

    // Check if token needs refresh
    if (token.expiresAt.getTime() < Date.now() + 60000) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update tokens in database
        await db
          .update(googleCalendarTokens)
          .set({
            accessToken: credentials.access_token!,
            expiresAt: new Date(credentials.expiry_date!),
            updatedAt: new Date(),
          })
          .where(eq(googleCalendarTokens.businessId, businessId));

        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('[GoogleCal] Token refresh failed for business:', businessId);
        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('[GoogleCal] Error getting business calendar client:', error);
    return null;
  }
}

/**
 * Get Replit connector access token (fallback for single-tenant/demo)
 */
async function getReplitAccessToken(): Promise<string> {
  if (replitConnectionSettings && replitConnectionSettings.settings?.expires_at && 
      new Date(replitConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return replitConnectionSettings.settings.access_token;
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

  replitConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = replitConnectionSettings?.settings?.access_token || 
                     replitConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!replitConnectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

/**
 * Get Replit connector calendar client (fallback)
 */
async function getReplitCalendarClient(): Promise<calendar_v3.Calendar> {
  const accessToken = await getReplitAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Get calendar client - tries per-business first, falls back to Replit connector
 */
async function getCalendarClient(businessId?: string): Promise<calendar_v3.Calendar | null> {
  // Try per-business tokens first
  if (businessId) {
    const businessClient = await getBusinessCalendarClient(businessId);
    if (businessClient) {
      console.log(`[GoogleCal] Using per-business calendar for ${businessId}`);
      return businessClient;
    }
  }

  // Fall back to Replit connector
  try {
    const replitClient = await getReplitCalendarClient();
    console.log('[GoogleCal] Using Replit connector (fallback/demo mode)');
    return replitClient;
  } catch {
    return null;
  }
}

/**
 * Check if Google Calendar is connected for a business
 */
export async function isGoogleCalendarConnected(businessId?: string): Promise<boolean> {
  try {
    const client = await getCalendarClient(businessId);
    return client !== null;
  } catch {
    return false;
  }
}

/**
 * Check if business has its own Google Calendar connected
 */
export async function hasBusinessCalendar(businessId: string): Promise<{ connected: boolean; email?: string }> {
  try {
    const [token] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.businessId, businessId))
      .limit(1);

    return {
      connected: !!token,
      email: token?.email || undefined,
    };
  } catch {
    return { connected: false };
  }
}

/**
 * Get Google OAuth URL for a business to connect their calendar
 */
export function getGoogleAuthUrl(businessId: string, ownerToken: string): string {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const state = Buffer.from(JSON.stringify({ businessId, ownerToken })).toString('base64');

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens and save
 */
export async function handleGoogleCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return { success: false, error: 'Google OAuth not configured' };
    }

    const { businessId, ownerToken } = JSON.parse(Buffer.from(state, 'base64').toString());

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Upsert token record
    const existingToken = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.businessId, businessId))
      .limit(1);

    if (existingToken.length > 0) {
      await db
        .update(googleCalendarTokens)
        .set({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || existingToken[0].refreshToken,
          expiresAt: new Date(tokens.expiry_date!),
          email: userInfo.email,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.businessId, businessId));
    } else {
      await db.insert(googleCalendarTokens).values({
        businessId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        email: userInfo.email,
      });
    }

    console.log(`[GoogleCal] Calendar connected for business ${businessId} (${userInfo.email})`);
    return { success: true };
  } catch (error: any) {
    console.error('[GoogleCal] OAuth callback error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect Google Calendar for a business
 */
export async function disconnectGoogleCalendar(businessId: string): Promise<boolean> {
  try {
    await db
      .delete(googleCalendarTokens)
      .where(eq(googleCalendarTokens.businessId, businessId));
    console.log(`[GoogleCal] Calendar disconnected for business ${businessId}`);
    return true;
  } catch (error) {
    console.error('[GoogleCal] Error disconnecting calendar:', error);
    return false;
  }
}

/**
 * Get busy times from Google Calendar for a specific date range
 */
export async function getGoogleBusyTimes(
  startDate: string,
  endDate: string,
  timeZone: string = 'Pacific/Auckland',
  businessId?: string
): Promise<{ start: string; end: string }[]> {
  try {
    const calendar = await getCalendarClient(businessId);
    if (!calendar) {
      console.log('[GoogleCal] No calendar client available');
      return [];
    }
    
    // Get the primary calendar ID
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
 */
export async function pushBookingToGoogleCalendar(booking: {
  id: string;
  businessId?: string;
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
    const calendar = await getCalendarClient(booking.businessId);
    if (!calendar) {
      console.log('[GoogleCal] No calendar client available for push');
      return null;
    }
    
    // Calculate end time
    const startDateTime = new Date(`${booking.date}T${booking.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + booking.duration * 60 * 1000);

    const event: calendar_v3.Schema$Event = {
      summary: `${booking.serviceName} - ${booking.customerName}`,
      description: `Booked via BookFlow\n\nCustomer: ${booking.customerName}\nEmail: ${booking.customerEmail || 'N/A'}\nService: ${booking.serviceName}\nPrice: $${((booking.totalPrice || 0) / 100).toFixed(2)}\nBooking ID: ${booking.id.substring(0, 8).toUpperCase()}`,
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
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(eventId: string, businessId?: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient(businessId);
    if (!calendar) return false;

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
    const slotStart = new Date(`${date}T${slot}:00`);
    const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);
    
    const hasConflict = busyTimes.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });
    
    return !hasConflict;
  });
}
