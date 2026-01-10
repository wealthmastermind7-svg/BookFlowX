import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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
  description: text("description"),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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
  paymentStatus: text("payment_status").default("unpaid"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
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

// Relations
export const businessesRelations = relations(businesses, ({ many, one }) => ({
  users: many(users),
  services: many(services),
  customers: many(customers),
  bookings: many(bookings),
  availability: many(availability),
  pushTokens: many(pushTokens),
  quickSales: many(quickSales),
  workflows: many(workflows),
  theme: one(businessThemes),
  apiKeys: many(apiKeys),
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
});

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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;

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
