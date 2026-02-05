import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiUrl } from "./query-client";

const BUSINESS_ID_KEY = "bookflow_business_id";
const BUSINESS_TOKEN_KEY = "bookflow_business_token";

function getApiBase(): string {
  return getApiUrl();
}

let cachedToken: string | null = null;

async function getSecureToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(BUSINESS_TOKEN_KEY);
    }
    const token = await SecureStore.getItemAsync(BUSINESS_TOKEN_KEY);
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

async function setSecureToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(BUSINESS_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(BUSINESS_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Failed to save token:", error);
  }
}

export function generateSlugFromName(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Use a short random suffix to ensure uniqueness even for duplicate names
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return baseSlug ? `${baseSlug}-${randomSuffix}` : `business-${randomSuffix}`;
}

async function makeRequest<T>(
  method: string,
  path: string,
  data?: unknown,
  authenticated: boolean = true
): Promise<T> {
  const url = new URL(path, getApiBase());
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (authenticated) {
    const token = await getSecureToken();
    if (token) {
      headers["x-business-token"] = token;
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  timezone?: string | null;
  notificationsEnabled?: boolean | null;
  bookingUrl?: string | null;
  ownerToken?: string | null;
  currency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ServiceUpsell {
  name: string;
  description: string;
  price: number;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  duration: number;
  price: number;
  upsells?: string | null; // JSON array of ServiceUpsell objects
  isActive?: boolean | null;
  createdAt?: string | null;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  totalBookings?: number | null;
  createdAt?: string | null;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  date: string;
  time: string;
  status: string;
  totalPrice: number;
  notes?: string | null;
  addons?: string | null;
  paymentStatus?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  confirmationSentAt?: string | null;
  reminder24hSentAt?: string | null;
  reminder2hSentAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customerName?: string;
  serviceName?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  totalServices: number;
  todayBookings: number;
  weeklyData: { day: string; revenue: number }[];
  recentBookings: Booking[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  isBlocked?: boolean;
}

export interface BlockedSlot {
  id: string;
  businessId: string;
  date: string;
  time: string;
  reason?: string | null;
  createdAt?: string | null;
}

export interface Availability {
  id: string;
  businessId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilitySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

class ApiClient {
  private businessId: string | null = null;

  async setBusinessId(id: string, token?: string): Promise<void> {
    this.businessId = id;
    await AsyncStorage.setItem(BUSINESS_ID_KEY, id).catch(console.error);
    if (token) {
      await setSecureToken(token);
    }
  }

  getBusinessId(): string | null {
    return this.businessId;
  }

  async loadBusinessId(): Promise<string | null> {
    if (this.businessId) return this.businessId;
    try {
      const saved = await AsyncStorage.getItem(BUSINESS_ID_KEY);
      if (saved) {
        this.businessId = saved;
        await getSecureToken();
      }
      return saved;
    } catch {
      return null;
    }
  }

  private getBusinessPath(): string {
    if (!this.businessId) {
      throw new Error("Business ID not set. Call setBusinessId first.");
    }
    return `/api/businesses/${this.businessId}`;
  }

  async getOrCreateBusiness(): Promise<Business> {
    try {
      // Check if we already have a business ID saved
      const existingId = await this.loadBusinessId();
      if (existingId) {
        const existingBusiness = await this.getBusiness();
        if (existingBusiness) {
          return existingBusiness;
        }
      }
      
      // Generate a unique slug for new business
      const businessName = "My Business";
      const uniqueSlug = generateSlugFromName(businessName);
      
      const newBusiness = await makeRequest<Business>("POST", "/api/businesses", {
        name: businessName,
        slug: uniqueSlug,
        description: "Welcome to your new booking platform",
        phone: "",
        email: "",
      }, false);
      await this.setBusinessId(newBusiness.id, newBusiness.ownerToken ?? undefined);
      return newBusiness;
    } catch (error) {
      console.error("Error creating business:", error);
      throw error;
    }
  }

  async getBusiness(): Promise<Business | null> {
    if (!this.businessId) return null;
    try {
      const token = await getSecureToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["x-business-token"] = token;
      }

      const res = await fetch(`${getApiBase()}api/businesses/${this.businessId}`, {
        headers
      });
      if (!res.ok) return null;
      const business = await res.json();
      
      // Sync Business ID if token belongs to a different one
      if (business.id !== this.businessId) {
        console.warn(`[API] Business ID sync: ${this.businessId} -> ${business.id}`);
        await this.setBusinessId(business.id);
      }

      if (business.ownerToken && !cachedToken) {
        await setSecureToken(business.ownerToken);
      }
      return business;
    } catch {
      return null;
    }
  }

  async updateBusiness(updates: Partial<Business>): Promise<Business> {
    // Always sync business ID with server before updates
    // This prevents token/businessId mismatch errors on mobile where
    // stored IDs can get out of sync
    const currentBusiness = await this.getBusiness();
    if (!currentBusiness) {
      throw new Error("No business found - please reload the app");
    }
    // getBusiness() already syncs this.businessId if there's a mismatch
    return makeRequest<Business>("PATCH", `/api/businesses/${this.businessId}`, updates);
  }

  async getServices(): Promise<Service[]> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/services`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async getService(id: string): Promise<Service | null> {
    try {
      const res = await fetch(`${getApiBase()}api/services/${id}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async createService(service: Omit<Service, "id" | "businessId" | "createdAt">): Promise<Service> {
    return makeRequest<Service>("POST", `${this.getBusinessPath()}/services`, service);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service> {
    return makeRequest<Service>("PATCH", `/api/services/${id}`, updates);
  }

  async deleteService(id: string): Promise<void> {
    await makeRequest<void>("DELETE", `/api/services/${id}`);
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/customers`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const res = await fetch(`${getApiBase()}api/customers/${id}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async createCustomer(customer: Omit<Customer, "id" | "businessId" | "createdAt" | "totalBookings">): Promise<Customer> {
    return makeRequest<Customer>("POST", `${this.getBusinessPath()}/customers`, customer);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return makeRequest<Customer>("PATCH", `/api/customers/${id}`, updates);
  }

  async getBookings(date?: string): Promise<Booking[]> {
    try {
      const url = date 
        ? `${getApiBase()}${this.getBusinessPath()}/bookings?date=${date}`
        : `${getApiBase()}${this.getBusinessPath()}/bookings`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async getBooking(id: string): Promise<Booking | null> {
    try {
      const res = await fetch(`${getApiBase()}api/bookings/${id}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async createBooking(booking: Omit<Booking, "id" | "businessId" | "createdAt" | "updatedAt">): Promise<Booking> {
    return makeRequest<Booking>("POST", `${this.getBusinessPath()}/bookings`, booking);
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    return makeRequest<Booking>("PATCH", `/api/bookings/${id}`, updates);
  }

  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/stats`);
      if (!res.ok) {
        return {
          totalRevenue: 0,
          totalBookings: 0,
          totalCustomers: 0,
          totalServices: 0,
          todayBookings: 0,
          weeklyData: [],
          recentBookings: [],
        };
      }
      return res.json();
    } catch {
      return {
        totalRevenue: 0,
        totalBookings: 0,
        totalCustomers: 0,
        totalServices: 0,
        todayBookings: 0,
        weeklyData: [],
        recentBookings: [],
      };
    }
  }

  async getTimeSlots(date: string, serviceId?: string): Promise<TimeSlot[]> {
    try {
      const url = serviceId 
        ? `${getApiBase()}${this.getBusinessPath()}/slots/${date}?serviceId=${serviceId}`
        : `${getApiBase()}${this.getBusinessPath()}/slots/${date}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.slots || [];
    } catch {
      return [];
    }
  }

  async initializeDemoData(businessType: string = "salon"): Promise<void> {
    await makeRequest<void>("POST", `${this.getBusinessPath()}/demo-data`, { businessType });
  }

  async clearAllData(): Promise<void> {
    return makeRequest<void>("DELETE", `${this.getBusinessPath()}/data`);
  }

  async getQRCode(): Promise<{ qrCode: string; bookingUrl: string } | null> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/qrcode`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async getAvailability(): Promise<Availability[]> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/availability`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async updateAvailability(dayOfWeek: number, schedule: Partial<AvailabilitySchedule>): Promise<Availability> {
    return makeRequest<Availability>("PUT", `${this.getBusinessPath()}/availability/${dayOfWeek}`, schedule);
  }

  async bulkUpdateAvailability(schedules: AvailabilitySchedule[]): Promise<Availability[]> {
    return makeRequest<Availability[]>("PUT", `${this.getBusinessPath()}/availability`, { schedules });
  }

  async getBlockedSlots(): Promise<BlockedSlot[]> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/blocked-slots`, {
        headers: { "x-business-token": (await getSecureToken()) || "" },
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async getBlockedSlotsByDate(date: string): Promise<BlockedSlot[]> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/blocked-slots/${date}`, {
        headers: { "x-business-token": (await getSecureToken()) || "" },
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async blockSlot(date: string, time: string, reason?: string): Promise<BlockedSlot> {
    return makeRequest<BlockedSlot>("POST", `${this.getBusinessPath()}/blocked-slots`, { date, time, reason });
  }

  async unblockSlot(date: string, time: string): Promise<void> {
    return makeRequest<void>("DELETE", `${this.getBusinessPath()}/blocked-slots/${date}/${encodeURIComponent(time)}`);
  }

  async getEmbedCode(): Promise<EmbedCode | null> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/embed-code`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async getWidgetTheme(): Promise<WidgetTheme | null> {
    try {
      const res = await fetch(`${getApiBase()}${this.getBusinessPath()}/theme`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async extractThemeFromWebsite(url: string): Promise<Partial<WidgetTheme>> {
    return makeRequest<Partial<WidgetTheme>>("POST", `${this.getBusinessPath()}/theme/extract`, { url });
  }

  async getCurrentBusiness(): Promise<Business | null> {
    return this.getBusiness();
  }

  async updateWidgetTheme(theme: Partial<WidgetTheme>): Promise<WidgetTheme> {
    return makeRequest<WidgetTheme>("PUT", `${this.getBusinessPath()}/theme`, theme);
  }

  getBaseUrl(): string {
    return getApiBase();
  }

  async getOwnerToken(): Promise<string | null> {
    return getSecureToken();
  }

  async createVoiceCheckout(businessId: string, tierId: string): Promise<{ url: string }> {
    return makeRequest<{ url: string }>("POST", "/api/voice-checkout", { businessId, tierId });
  }
}

export interface EmbedCode {
  embedUrl: string;
  scriptUrl: string;
  inlineCode: string;
  popupButtonCode: string;
  popupTextCode: string;
  businessSlug: string;
}

export interface WidgetTheme {
  id?: string;
  businessId?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  glassBlurIntensity: number;
  fontFamily: string;
  buttonStyle: "rounded" | "pill" | "square";
  showPoweredBy: boolean;
  customCss?: string | null;
}

export interface CustomerInsight {
  id: string;
  name: string;
  email: string;
  segment: "vip" | "regular" | "at_risk" | "new";
  totalBookings: number;
  totalSpend: number;
  lastBookingDate: string | null;
  avgBookingValue: number;
}

export interface CustomerInsightsResult {
  topCustomers: CustomerInsight[];
  atRiskCustomers: CustomerInsight[];
  newCustomers: CustomerInsight[];
  mostFrequentServices: { name: string; count: number; revenue: number }[];
  summary: {
    totalCustomers: number;
    vipCount: number;
    atRiskCount: number;
    avgCustomerValue: number;
  };
}

export async function getCustomerInsights(businessId: string): Promise<CustomerInsightsResult | null> {
  try {
    const response = await fetch(new URL(`/api/businesses/${businessId}/insights`, getApiUrl()).toString());
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export interface UpsellSuggestion {
  name: string;
  description: string;
  price: number;
  reason: string;
}

export async function getUpsellSuggestions(
  serviceName: string,
  serviceDescription: string,
  servicePrice: number,
  businessType?: string,
  currency?: string
): Promise<UpsellSuggestion[]> {
  try {
    const response = await fetch(new URL("/api/ai/upsell-suggestions", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceName, serviceDescription, servicePrice, businessType, currency }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}

// Business Knowledge types
export interface BusinessKnowledgeData {
  id?: string;
  businessId?: string;
  websiteUrl?: string;
  aboutBusiness?: string;
  servicesDescription?: string;
  hoursOfOperation?: string;
  locationInfo?: string;
  faqJson?: string;
  additionalInfo?: string;
  lastScrapedAt?: string;
}

export const api = new ApiClient();

export async function getBusinessKnowledge(): Promise<{ knowledge: BusinessKnowledgeData | null }> {
  try {
    const businessId = await api.loadBusinessId();
    if (!businessId) return { knowledge: null };
    const res = await fetch(`${getApiBase()}/api/businesses/${businessId}/knowledge`, {
      headers: { "x-business-token": (await getSecureToken()) || "" },
    });
    if (!res.ok) return { knowledge: null };
    return res.json();
  } catch {
    return { knowledge: null };
  }
}

export async function updateBusinessKnowledge(knowledge: Partial<BusinessKnowledgeData>): Promise<{ knowledge: BusinessKnowledgeData }> {
  const businessId = await api.loadBusinessId();
  if (!businessId) throw new Error("Business ID not found");
  const res = await fetch(`${getApiBase()}/api/businesses/${businessId}/knowledge`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-business-token": (await getSecureToken()) || "",
    },
    body: JSON.stringify(knowledge),
  });
  if (!res.ok) throw new Error("Failed to update business knowledge");
  return res.json();
}

export async function scrapeWebsite(websiteUrl: string): Promise<{ knowledge: BusinessKnowledgeData; scraped: boolean }> {
  const businessId = await api.loadBusinessId();
  if (!businessId) throw new Error("Business ID not found");
  const res = await fetch(`${getApiBase()}/api/businesses/${businessId}/knowledge/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-business-token": (await getSecureToken()) || "",
    },
    body: JSON.stringify({ websiteUrl }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to scrape website");
  }
  return res.json();
}
