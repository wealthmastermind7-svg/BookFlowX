import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (business owners/admins)
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  businessId: varchar("business_id").references(() => businesses.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Businesses table (multi-tenant core)
export const businesses = pgTable("businesses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  timezone: text("timezone").default("America/New_York"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  ownerToken: text("owner_token").default(sql`gen_random_uuid()`),
  isPremium: boolean("is_premium").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  weeklyShareCount: integer("weekly_share_count").default(0),
  weeklyQrCount: integer("weekly_qr_count").default(0),
  weeklyResetAt: timestamp("weekly_reset_at").defaultNow(),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status").default("not_connected"),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled").default(false),
  currency: text("currency").default("USD"),
  language: text("language").default("en"),
  publicPhone: text("public_phone"),
  publicWebsite: text("public_website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  upsells: text("upsells"), // JSON array of {name, description, price}
  photos: text("photos").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InspectionCondition = "good" | "fair" | "poor";
export type RentalStatus = "active" | "vacant" | "inspection_due";
export type InspectionType = "move_in" | "routine" | "move_out";
export type InspectionStatus = "draft" | "complete";

export interface InspectionRoom {
  id: string;
  name: string;
  condition: InspectionCondition;
  notes: string;
  photos: string[];
  photoTimestamps: string[];
}

export interface RentalProperty {
  id: string;
  businessId: string;
  address: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  moveInDate?: string;
  leaseEndDate?: string;
  status: RentalStatus;
  notes?: string;
  photos: string[];
  createdAt: string;
}

export interface InspectionReport {
  id: string;
  propertyId: string;
  businessId: string;
  type: InspectionType;
  date: string;
  status: InspectionStatus;
  rooms: InspectionRoom[];
  createdAt: string;
}

export const rentalProperties = pgTable("rental_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  tenantPhone: text("tenant_phone"),
  moveInDate: text("move_in_date"),
  leaseEndDate: text("lease_end_date"),
  status: text("status").$type<RentalStatus>().notNull().default("active"),
  notes: text("notes"),
  photos: text("photos").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inspectionReports = pgTable("inspection_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => rentalProperties.id, { onDelete: "cascade" }),
  type: text("type").$type<InspectionType>().notNull(),
  date: text("date").notNull(),
  status: text("status").$type<InspectionStatus>().notNull().default("draft"),
  rooms: jsonb("rooms").notNull().$type<InspectionRoom[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  totalBookings: integer("total_bookings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("pending"),
  totalPrice: integer("total_price").notNull(),
  notes: text("notes"),
  addons: text("addons"), // JSON array of {name, price} objects
  paymentStatus: text("payment_status").default("unpaid"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  reminder24hSentAt: timestamp("reminder_24h_sent_at"),
  reminder2hSentAt: timestamp("reminder_2h_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quick Sales table (for contactless tap-to-pay)
export const quickSales = pgTable("quick_sales", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Availability table (business hours/slots)
export const availability = pgTable("availability", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").default(true),
});

// Workflows table (automation triggers)
export const workflows = pgTable("workflows", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // 'booking_created' | 'booking_confirmed' | 'booking_reminder' | 'booking_completed' | 'booking_cancelled'
  triggerConditions: text("trigger_conditions"), // JSON string for conditional logic
  actionType: text("action_type").notNull(), // 'send_email' | 'send_sms' | 'webhook' | 'internal_notification'
  actionConfig: text("action_config").notNull(), // JSON string with action details
  delayMinutes: integer("delay_minutes").default(0), // Delay before executing action
  isActive: boolean("is_active").default(true),
  isPilot: boolean("is_pilot").default(false), // Suggestive mode - requires human approval
  industryBlueprint: text("industry_blueprint"), // 'salon' | 'fitness' | 'consulting' | 'medical' | 'auto'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business themes table (for widget customization)
export const businessThemes = pgTable("business_themes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  primaryColor: text("primary_color").default("#000000"),
  accentColor: text("accent_color").default("#C5A059"),
  backgroundColor: text("background_color").default("#FFFFFF"),
  textColor: text("text_color").default("#1A1C1E"),
  borderRadius: integer("border_radius").default(12), // px
  glassBlurIntensity: integer("glass_blur_intensity").default(20), // 0-100
  fontFamily: text("font_family").default("Inter"),
  buttonStyle: text("button_style").default("rounded"), // 'rounded' | 'pill' | 'square'
  showPoweredBy: boolean("show_powered_by").default(true),
  customCss: text("custom_css"), // Advanced users can inject custom CSS
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Keys table (for headless API access)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(), // Hashed API key
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  permissions: text("permissions").notNull(), // JSON array of permitted endpoints
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workflow execution logs
export const workflowLogs = pgTable("workflow_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),
  status: text("status").notNull(), // 'pending' | 'executing' | 'completed' | 'failed' | 'awaiting_approval'
  executedAt: timestamp("executed_at"),
  errorMessage: text("error_message"),
  responseData: text("response_data"), // JSON string of action response
  createdAt: timestamp("created_at").defaultNow(),
});

// Blocked time slots table (for date-specific time blocking)
export const blockedSlots = pgTable("blocked_slots", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  time: text("time").notNull(), // Time slot like "9:00 AM"
  reason: text("reason"), // Optional reason for blocking
  createdAt: timestamp("created_at").defaultNow(),
});

// Push tokens table (for Expo Push Notifications)
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios' | 'android' | 'web'
  deviceName: text("device_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice agent subscriptions table
export const voiceSubscriptions = pgTable("voice_subscriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("free"), // 'free' | 'starter' | 'pro' | 'business'
  minutesLimit: integer("minutes_limit").notNull().default(5), // Monthly limit
  minutesUsed: integer("minutes_used").notNull().default(0), // Current month usage
  periodStart: timestamp("period_start").defaultNow(), // Billing period start
  periodEnd: timestamp("period_end"), // Billing period end
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  status: text("status").notNull().default("active"), // 'active' | 'canceled' | 'past_due'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Calendar tokens table (per-business OAuth)
export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  calendarId: text("calendarId").default("primary"), // Which calendar to sync with
  email: text("email"), // Google account email for display
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Assistant training data table
export const trainingData = pgTable("training_data", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'qa_pair', 'website_crawl', 'document'
  question: text("question"),
  answer: text("answer"),
  content: text("content"), // For website crawl content
  title: text("title"), // Page title for crawled content
  sourceUrl: text("source_url"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Voice call logs table (for tracking usage)
export const voiceCallLogs = pgTable("voice_call_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  callId: text("call_id"), // Vapi call ID
  durationSeconds: integer("duration_seconds").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(0), // Rounded up
  customerPhone: text("customer_phone"),
  customerName: text("customer_name"),
  bookingCreated: boolean("booking_created").default(false),
  bookingId: varchar("booking_id"),
  status: text("status").notNull().default("completed"), // 'in_progress' | 'completed' | 'failed'
  cost: integer("cost").default(0), // Cost in cents
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const businessesRelations = relations(businesses, ({ many, one }) => ({
  users: many(users),
  services: many(services),
  customers: many(customers),
  bookings: many(bookings),
  availability: many(availability),
  blockedSlots: many(blockedSlots),
  pushTokens: many(pushTokens),
  quickSales: many(quickSales),
  workflows: many(workflows),
  theme: one(businessThemes),
  apiKeys: many(apiKeys),
  voiceSubscription: one(voiceSubscriptions),
  voiceCallLogs: many(voiceCallLogs),
  googleCalendarToken: one(googleCalendarTokens),
  trainingData: many(trainingData),
  rentalProperties: many(rentalProperties),
  inspectionReports: many(inspectionReports),
}));

export const rentalPropertiesRelations = relations(rentalProperties, ({ one, many }) => ({
  business: one(businesses, {
    fields: [rentalProperties.businessId],
    references: [businesses.id],
  }),
  inspections: many(inspectionReports),
}));

export const inspectionReportsRelations = relations(inspectionReports, ({ one }) => ({
  business: one(businesses, {
    fields: [inspectionReports.businessId],
    references: [businesses.id],
  }),
  property: one(rentalProperties, {
    fields: [inspectionReports.propertyId],
    references: [rentalProperties.id],
  }),
}));

export const trainingDataRelations = relations(trainingData, ({ one }) => ({
  business: one(businesses, {
    fields: [trainingData.businessId],
    references: [businesses.id],
  }),
}));

export const insertTrainingDataSchema = createInsertSchema(trainingData).omit({ 
  id: true, 
  createdAt: true 
});

export type TrainingData = typeof trainingData.$inferSelect;
export type InsertTrainingData = z.infer<typeof insertTrainingDataSchema>;

export const voiceSubscriptionsRelations = relations(voiceSubscriptions, ({ one }) => ({
  business: one(businesses, {
    fields: [voiceSubscriptions.businessId],
    references: [businesses.id],
  }),
}));

export const voiceCallLogsRelations = relations(voiceCallLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [voiceCallLogs.businessId],
    references: [businesses.id],
  }),
}));

export const googleCalendarTokensRelations = relations(googleCalendarTokens, ({ one }) => ({
  business: one(businesses, {
    fields: [googleCalendarTokens.businessId],
    references: [businesses.id],
  }),
}));

export const blockedSlotsRelations = relations(blockedSlots, ({ one }) => ({
  business: one(businesses, {
    fields: [blockedSlots.businessId],
    references: [businesses.id],
  }),
}));

export const quickSalesRelations = relations(quickSales, ({ one }) => ({
  business: one(businesses, {
    fields: [quickSales.businessId],
    references: [businesses.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, {
    fields: [services.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  business: one(businesses, {
    fields: [bookings.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  business: one(businesses, {
    fields: [availability.businessId],
    references: [businesses.id],
  }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  business: one(businesses, {
    fields: [pushTokens.businessId],
    references: [businesses.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  business: one(businesses, {
    fields: [workflows.businessId],
    references: [businesses.id],
  }),
  logs: many(workflowLogs),
}));

export const businessThemesRelations = relations(businessThemes, ({ one }) => ({
  business: one(businesses, {
    fields: [businessThemes.businessId],
    references: [businesses.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  business: one(businesses, {
    fields: [apiKeys.businessId],
    references: [businesses.id],
  }),
}));

export const workflowLogsRelations = relations(workflowLogs, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowLogs.workflowId],
    references: [workflows.id],
  }),
  booking: one(bookings, {
    fields: [workflowLogs.bookingId],
    references: [bookings.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  businessId: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
}).extend({
  photos: z.array(z.string().refine(isAllowedPhoto, "Photo must be an HTTPS URL or a persistent base64 image data URI no larger than 3 MB")).max(6).default([]),
});

function isAllowedPhoto(value: string): boolean {
  if (value.startsWith("data:")) {
    const match = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[1].length % 4 !== 0) return false;
    const padding = match[1].endsWith("==") ? 2 : match[1].endsWith("=") ? 1 : 0;
    const bytes = (match[1].length / 4) * 3 - padding;
    return bytes > 0 && bytes <= 3 * 1024 * 1024;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const rentalPhotoSchema = z.string().refine(
  isAllowedPhoto,
  "Photo must be an HTTPS URL or a persistent base64 image data URI no larger than 3 MB",
);

export const inspectionRoomSchema: z.ZodType<InspectionRoom> = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(100),
  condition: z.enum(["good", "fair", "poor"]),
  notes: z.string().max(5000),
  photos: z.array(rentalPhotoSchema).max(20),
  photoTimestamps: z.array(z.string().datetime({ offset: true })),
}).strict().superRefine((room, ctx) => {
  if (room.photoTimestamps.length !== room.photos.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["photoTimestamps"],
      message: "photoTimestamps must have the same length as photos",
    });
  }
});

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

const requiredIsoDateSchema = z.string().refine(isIsoCalendarDate, "Must be a valid ISO date (YYYY-MM-DD)");
const optionalIsoDateSchema = z.union([z.literal(""), requiredIsoDateSchema]).nullable().optional();

const rentalFieldsSchema = {
  address: z.string().trim().min(1).max(1000),
  tenantName: z.string().max(200).nullable().optional(),
  tenantEmail: z.union([z.string().email().max(320), z.literal("")]).nullable().optional(),
  tenantPhone: z.string().max(100).nullable().optional(),
  moveInDate: optionalIsoDateSchema,
  leaseEndDate: optionalIsoDateSchema,
  status: z.enum(["active", "vacant", "inspection_due"]).default("active"),
  notes: z.string().max(10000).nullable().optional(),
  photos: z.array(rentalPhotoSchema).max(6).default([]),
};

export const insertRentalPropertySchema = z.object(rentalFieldsSchema).strict();
export const updateRentalPropertySchema = z.object(rentalFieldsSchema).partial().strict();

const inspectionFieldsSchema = {
  type: z.enum(["move_in", "routine", "move_out"]),
  date: requiredIsoDateSchema,
  status: z.enum(["draft", "complete"]).default("draft"),
  rooms: z.array(inspectionRoomSchema).max(50),
};

export const insertInspectionReportSchema = z.object(inspectionFieldsSchema).strict();
export const updateInspectionReportSchema = z.object(inspectionFieldsSchema).partial().strict();

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
});

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots).omit({
  id: true,
  createdAt: true,
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickSaleSchema = createInsertSchema(quickSales).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessThemeSchema = createInsertSchema(businessThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertWorkflowLogSchema = createInsertSchema(workflowLogs).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceSubscriptionSchema = createInsertSchema(voiceSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceCallLogSchema = createInsertSchema(voiceCallLogs).omit({
  id: true,
  createdAt: true,
});

export const insertGoogleCalendarTokenSchema = createInsertSchema(googleCalendarTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertRentalProperty = z.infer<typeof insertRentalPropertySchema>;
export type UpdateRentalProperty = z.infer<typeof updateRentalPropertySchema>;
export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type UpdateInspectionReport = z.infer<typeof updateInspectionReportSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = z.infer<typeof insertBlockedSlotSchema>;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;

export type VoiceSubscription = typeof voiceSubscriptions.$inferSelect;
export type InsertVoiceSubscription = z.infer<typeof insertVoiceSubscriptionSchema>;

export type VoiceCallLog = typeof voiceCallLogs.$inferSelect;
export type InsertVoiceCallLog = z.infer<typeof insertVoiceCallLogSchema>;

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = z.infer<typeof insertGoogleCalendarTokenSchema>;

export type QuickSale = typeof quickSales.$inferSelect;
export type InsertQuickSale = z.infer<typeof insertQuickSaleSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type BusinessTheme = typeof businessThemes.$inferSelect;
export type InsertBusinessTheme = z.infer<typeof insertBusinessThemeSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type WorkflowLog = typeof workflowLogs.$inferSelect;
export type InsertWorkflowLog = z.infer<typeof insertWorkflowLogSchema>;

// Booking status type
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

// Payment status type
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

// Stripe account status type
export type StripeAccountStatus = "not_connected" | "pending" | "active" | "restricted";

// Workflow types
export type WorkflowTriggerType = 
  | "booking_created" 
  | "booking_confirmed" 
  | "booking_reminder" 
  | "booking_completed" 
  | "booking_cancelled"
  | "customer_created"
  | "payment_received";

export type WorkflowActionType = 
  | "send_email" 
  | "send_sms" 
  | "webhook" 
  | "internal_notification";

export type IndustryBlueprint = 
  | "salon" 
  | "fitness" 
  | "consulting" 
  | "medical" 
  | "auto" 
  | "custom";

export type WorkflowLogStatus = 
  | "pending" 
  | "executing" 
  | "completed" 
  | "failed" 
  | "awaiting_approval";

export type ButtonStyle = "rounded" | "pill" | "square";
