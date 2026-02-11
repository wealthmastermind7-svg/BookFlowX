import {
  users,
  businesses,
  services,
  customers,
  bookings,
  availability,
  blockedSlots,
  pushTokens,
  quickSales,
  workflows,
  businessThemes,
  apiKeys,
  workflowLogs,
  voiceSubscriptions,
  voiceCallLogs,
  trainingData,
  type User,
  type InsertUser,
  type Business,
  type InsertBusiness,
  type Service,
  type InsertService,
  type Customer,
  type InsertCustomer,
  type Booking,
  type InsertBooking,
  type Availability,
  type InsertAvailability,
  type BlockedSlot,
  type InsertBlockedSlot,
  type PushToken,
  type InsertPushToken,
  type QuickSale,
  type InsertQuickSale,
  type Workflow,
  type InsertWorkflow,
  type BusinessTheme,
  type InsertBusinessTheme,
  type ApiKey,
  type InsertApiKey,
  type WorkflowLog,
  type InsertWorkflowLog,
  type VoiceSubscription,
  type InsertVoiceSubscription,
  type VoiceCallLog,
  type InsertVoiceCallLog,
  type TrainingData,
  type InsertTrainingData,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Businesses
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
  getBusinessByToken(ownerToken: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, updates: Partial<InsertBusiness>): Promise<Business | undefined>;
  
  // Services
  getServices(businessId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  getServiceBySlug(businessId: string, slug: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;
  
  // Customers
  getCustomers(businessId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(businessId: string, email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  
  // Bookings
  getBookings(businessId: string): Promise<(Booking & { customerName: string; serviceName: string })[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByDate(businessId: string, date: string): Promise<(Booking & { customerName: string; serviceName: string })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Availability
  getAvailability(businessId: string): Promise<Availability[]>;
  setAvailability(availability: InsertAvailability): Promise<Availability>;
  updateOrCreateAvailability(availability: InsertAvailability): Promise<Availability>;
  
  // Blocked Slots
  getBlockedSlots(businessId: string): Promise<BlockedSlot[]>;
  getBlockedSlotsByDate(businessId: string, date: string): Promise<BlockedSlot[]>;
  createBlockedSlot(blockedSlot: InsertBlockedSlot): Promise<BlockedSlot>;
  deleteBlockedSlot(id: string): Promise<void>;
  deleteBlockedSlotByDateTime(businessId: string, date: string, time: string): Promise<void>;
  
  // Demo Data
  initializeDemoData(businessId: string): Promise<void>;
  clearAllData(businessId: string): Promise<void>;
  
  // Push Tokens
  getPushTokens(businessId: string): Promise<PushToken[]>;
  getPushTokenByToken(token: string): Promise<PushToken | undefined>;
  createPushToken(pushToken: InsertPushToken): Promise<PushToken>;
  updatePushToken(id: string, updates: Partial<InsertPushToken>): Promise<PushToken | undefined>;
  deletePushToken(token: string, businessId: string): Promise<void>;
  deactivatePushToken(token: string): Promise<void>;
  
  // Quick Sales
  getQuickSales(businessId: string): Promise<QuickSale[]>;
  getQuickSale(id: string): Promise<QuickSale | undefined>;
  createQuickSale(quickSale: InsertQuickSale): Promise<QuickSale>;
  updateQuickSale(id: string, updates: Partial<InsertQuickSale>): Promise<QuickSale | undefined>;
  
  // Workflows
  getWorkflows(businessId: string): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  getWorkflowsByTrigger(businessId: string, triggerType: string): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<InsertWorkflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: string): Promise<void>;
  
  // Business Themes
  getBusinessTheme(businessId: string): Promise<BusinessTheme | undefined>;
  createOrUpdateBusinessTheme(theme: InsertBusinessTheme): Promise<BusinessTheme>;
  
  // API Keys
  getApiKeys(businessId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deleteApiKey(id: string): Promise<void>;
  
  // Workflow Logs
  getWorkflowLogs(workflowId: string): Promise<WorkflowLog[]>;
  createWorkflowLog(log: InsertWorkflowLog): Promise<WorkflowLog>;
  updateWorkflowLog(id: string, updates: Partial<InsertWorkflowLog>): Promise<WorkflowLog | undefined>;
  clearWorkflows(businessId: string): Promise<void>;

  // Assistant Training Data
  getTrainingData(businessId: string): Promise<TrainingData[]>;
  createTrainingData(data: InsertTrainingData): Promise<TrainingData>;
  deleteTrainingData(id: string): Promise<void>;

  // Voice Subscriptions
  getVoiceSubscription(businessId: string): Promise<VoiceSubscription | undefined>;
  createVoiceSubscription(sub: InsertVoiceSubscription): Promise<VoiceSubscription>;
  updateVoiceSubscription(businessId: string, updates: Partial<InsertVoiceSubscription>): Promise<VoiceSubscription | undefined>;
  incrementVoiceMinutes(businessId: string, minutes: number): Promise<void>;
  checkVoiceMinutesAvailable(businessId: string): Promise<{ available: boolean; remainingMinutes: number }>;
  getVoiceUsageStats(businessId: string): Promise<{ usedMinutes: number; totalMinutes: number }>;

  // Voice Call Logs
  createVoiceCallLog(log: InsertVoiceCallLog): Promise<VoiceCallLog>;
  getVoiceCallLogs(businessId: string): Promise<VoiceCallLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Businesses
  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug));
    return business || undefined;
  }

  async getBusinessByToken(ownerToken: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerToken, ownerToken));
    return business || undefined;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  private async generateUniqueBusinessSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    
    // Add a short random suffix immediately to minimize collisions
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug}-${randomSuffix}`;
    
    let counter = 1;
    while (true) {
      const existing = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, slug));
      
      if (existing.length === 0 || (excludeId && existing.length === 1 && existing[0].id === excludeId)) {
        break;
      }
      slug = `${baseSlug}-${randomSuffix}-${counter}`;
      counter++;
    }

    return slug;
  }

  async updateBusiness(id: string, updates: Partial<InsertBusiness>): Promise<Business | undefined> {
    let finalUpdates = { ...updates };
    
    // If name is updated, check if we need to update the slug to match
    // and ensure it's unique to avoid "businesses_slug_unique" constraint violations
    if (updates.name && !updates.slug) {
      const slug = await this.generateUniqueBusinessSlug(updates.name, id);
      finalUpdates.slug = slug;
    }

    const [updated] = await db
      .update(businesses)
      .set({ ...finalUpdates, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updated || undefined;
  }

  // Services
  async getServices(businessId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.businessId, businessId));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServiceBySlug(businessId: string, slug: string): Promise<Service | undefined> {
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.businessId, businessId), eq(services.slug, slug)));
    return service || undefined;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 100); // Limit slug length to avoid DB or URL issues
  }

  private async generateUniqueServiceSlug(businessId: string, name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db
        .select()
        .from(services)
        .where(and(eq(services.businessId, businessId), eq(services.slug, slug)));
      
      if (existing.length === 0 || (excludeId && existing.length === 1 && existing[0].id === excludeId)) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async createService(service: InsertService): Promise<Service> {
    const slug = await this.generateUniqueServiceSlug(service.businessId, service.name);
    const [created] = await db.insert(services).values({ ...service, slug }).returning();
    return created;
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined> {
    let finalUpdates = { ...updates };
    
    if (updates.name) {
      const existing = await this.getService(id);
      if (existing) {
        const slug = await this.generateUniqueServiceSlug(existing.businessId, updates.name, id);
        finalUpdates = { ...finalUpdates, slug };
      }
    }
    
    const [updated] = await db
      .update(services)
      .set(finalUpdates)
      .where(eq(services.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Customers
  async getCustomers(businessId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.businessId, businessId));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(businessId: string, email: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.email, email)));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  // Bookings
  async getBookings(businessId: string): Promise<(Booking & { customerName: string; serviceName: string })[]> {
    const result = await db
      .select({
        id: bookings.id,
        businessId: bookings.businessId,
        customerId: bookings.customerId,
        serviceId: bookings.serviceId,
        date: bookings.date,
        time: bookings.time,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        notes: bookings.notes,
        addons: bookings.addons,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        paymentStatus: bookings.paymentStatus,
        stripePaymentIntentId: bookings.stripePaymentIntentId,
        stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
        confirmationSentAt: bookings.confirmationSentAt,
        reminder24hSentAt: bookings.reminder24hSentAt,
        reminder2hSentAt: bookings.reminder2hSentAt,
        customerName: customers.name,
        serviceName: services.name,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.businessId, businessId))
      .orderBy(desc(bookings.createdAt));
    
    return result.map(r => ({
      ...r,
      customerName: r.customerName || "Unknown",
      serviceName: r.serviceName || "Unknown",
    }));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByDate(businessId: string, date: string): Promise<(Booking & { customerName: string; serviceName: string })[]> {
    const result = await db
      .select({
        id: bookings.id,
        businessId: bookings.businessId,
        customerId: bookings.customerId,
        serviceId: bookings.serviceId,
        date: bookings.date,
        time: bookings.time,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        notes: bookings.notes,
        addons: bookings.addons,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        paymentStatus: bookings.paymentStatus,
        stripePaymentIntentId: bookings.stripePaymentIntentId,
        stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
        confirmationSentAt: bookings.confirmationSentAt,
        reminder24hSentAt: bookings.reminder24hSentAt,
        reminder2hSentAt: bookings.reminder2hSentAt,
        customerName: customers.name,
        serviceName: services.name,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(and(eq(bookings.businessId, businessId), eq(bookings.date, date)))
      .orderBy(bookings.time);
    
    return result.map(r => ({
      ...r,
      customerName: r.customerName || "Unknown",
      serviceName: r.serviceName || "Unknown",
    }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    
    // Update customer booking count
    await db
      .update(customers)
      .set({ totalBookings: sql`${customers.totalBookings} + 1` })
      .where(eq(customers.id, booking.customerId));
    
    return created;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated || undefined;
  }

  // Availability
  async getAvailability(businessId: string): Promise<Availability[]> {
    return db.select().from(availability).where(eq(availability.businessId, businessId));
  }

  async setAvailability(avail: InsertAvailability): Promise<Availability> {
    const [created] = await db.insert(availability).values(avail).returning();
    return created;
  }

  async updateOrCreateAvailability(avail: InsertAvailability): Promise<Availability> {
    // Check if availability for this day already exists
    const existing = await db
      .select()
      .from(availability)
      .where(and(
        eq(availability.businessId, avail.businessId),
        eq(availability.dayOfWeek, avail.dayOfWeek)
      ));
    
    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(availability)
        .set({
          startTime: avail.startTime,
          endTime: avail.endTime,
          isActive: avail.isActive,
        })
        .where(eq(availability.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(availability).values(avail).returning();
      return created;
    }
  }

  // Blocked Slots
  async getBlockedSlots(businessId: string): Promise<BlockedSlot[]> {
    return db.select().from(blockedSlots).where(eq(blockedSlots.businessId, businessId));
  }

  async getBlockedSlotsByDate(businessId: string, date: string): Promise<BlockedSlot[]> {
    return db
      .select()
      .from(blockedSlots)
      .where(and(eq(blockedSlots.businessId, businessId), eq(blockedSlots.date, date)));
  }

  async createBlockedSlot(blockedSlot: InsertBlockedSlot): Promise<BlockedSlot> {
    const [created] = await db.insert(blockedSlots).values(blockedSlot).returning();
    return created;
  }

  async deleteBlockedSlot(id: string): Promise<void> {
    await db.delete(blockedSlots).where(eq(blockedSlots.id, id));
  }

  async deleteBlockedSlotByDateTime(businessId: string, date: string, time: string): Promise<void> {
    await db
      .delete(blockedSlots)
      .where(
        and(
          eq(blockedSlots.businessId, businessId),
          eq(blockedSlots.date, date),
          eq(blockedSlots.time, time)
        )
      );
  }

  // Push Tokens
  async getPushTokens(businessId: string): Promise<PushToken[]> {
    return db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.businessId, businessId), eq(pushTokens.isActive, true)));
  }

  async getPushTokenByToken(token: string): Promise<PushToken | undefined> {
    const [pushToken] = await db.select().from(pushTokens).where(eq(pushTokens.token, token));
    return pushToken || undefined;
  }

  async createPushToken(pushToken: InsertPushToken): Promise<PushToken> {
    // Check if token already exists
    const existing = await this.getPushTokenByToken(pushToken.token);
    if (existing) {
      // Update existing token
      const [updated] = await db
        .update(pushTokens)
        .set({ ...pushToken, isActive: true, updatedAt: new Date() })
        .where(eq(pushTokens.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(pushTokens).values(pushToken).returning();
    return created;
  }

  async updatePushToken(id: string, updates: Partial<InsertPushToken>): Promise<PushToken | undefined> {
    const [updated] = await db
      .update(pushTokens)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pushTokens.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePushToken(token: string, businessId: string): Promise<void> {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.token, token), eq(pushTokens.businessId, businessId)));
  }

  async deactivatePushToken(token: string): Promise<void> {
    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushTokens.token, token));
  }

  // Quick Sales
  async getQuickSales(businessId: string): Promise<QuickSale[]> {
    return db.select().from(quickSales).where(eq(quickSales.businessId, businessId));
  }

  async getQuickSale(id: string): Promise<QuickSale | undefined> {
    const [quickSale] = await db.select().from(quickSales).where(eq(quickSales.id, id));
    return quickSale || undefined;
  }

  async createQuickSale(quickSale: InsertQuickSale): Promise<QuickSale> {
    const [created] = await db.insert(quickSales).values(quickSale).returning();
    return created;
  }

  async updateQuickSale(id: string, updates: Partial<InsertQuickSale>): Promise<QuickSale | undefined> {
    const [updated] = await db
      .update(quickSales)
      .set(updates)
      .where(eq(quickSales.id, id))
      .returning();
    return updated || undefined;
  }

  // Workflows
  async getWorkflows(businessId: string): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.businessId, businessId));
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow || undefined;
  }

  async getWorkflowsByTrigger(businessId: string, triggerType: string): Promise<Workflow[]> {
    return db
      .select()
      .from(workflows)
      .where(and(eq(workflows.businessId, businessId), eq(workflows.triggerType, triggerType), eq(workflows.isActive, true)));
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const [created] = await db.insert(workflows).values(workflow).returning();
    return created;
  }

  async updateWorkflow(id: string, updates: Partial<InsertWorkflow>): Promise<Workflow | undefined> {
    const [updated] = await db
      .update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await db.delete(workflows).where(eq(workflows.id, id));
  }

  // Business Themes
  async getBusinessTheme(businessId: string): Promise<BusinessTheme | undefined> {
    const [theme] = await db.select().from(businessThemes).where(eq(businessThemes.businessId, businessId));
    return theme || undefined;
  }

  async createOrUpdateBusinessTheme(theme: InsertBusinessTheme): Promise<BusinessTheme> {
    const existing = await this.getBusinessTheme(theme.businessId);
    if (existing) {
      const [updated] = await db
        .update(businessThemes)
        .set({ ...theme, updatedAt: new Date() })
        .where(eq(businessThemes.businessId, theme.businessId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(businessThemes).values(theme).returning();
    return created;
  }

  // API Keys
  async getApiKeys(businessId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.businessId, businessId));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return apiKey || undefined;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // Workflow Logs
  async getWorkflowLogs(workflowId: string): Promise<WorkflowLog[]> {
    return db.select().from(workflowLogs).where(eq(workflowLogs.workflowId, workflowId)).orderBy(desc(workflowLogs.createdAt));
  }

  async createWorkflowLog(log: InsertWorkflowLog): Promise<WorkflowLog> {
    const [created] = await db.insert(workflowLogs).values(log).returning();
    return created;
  }

  async updateWorkflowLog(id: string, updates: Partial<InsertWorkflowLog>): Promise<WorkflowLog | undefined> {
    const [updated] = await db
      .update(workflowLogs)
      .set(updates)
      .where(eq(workflowLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async clearWorkflows(businessId: string): Promise<void> {
    await db.delete(workflows).where(eq(workflows.businessId, businessId));
  }

  // Assistant Training Data
  async getTrainingData(businessId: string): Promise<TrainingData[]> {
    return db
      .select()
      .from(trainingData)
      .where(and(eq(trainingData.businessId, businessId), eq(trainingData.status, "active")))
      .orderBy(desc(trainingData.createdAt));
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const [created] = await db.insert(trainingData).values(data).returning();
    return created;
  }

  async deleteTrainingData(id: string): Promise<void> {
    await db.delete(trainingData).where(eq(trainingData.id, id));
  }

  // Voice Subscriptions
  async getVoiceSubscription(businessId: string): Promise<VoiceSubscription | undefined> {
    const [sub] = await db.select().from(voiceSubscriptions).where(eq(voiceSubscriptions.businessId, businessId));
    return sub || undefined;
  }

  async createVoiceSubscription(sub: InsertVoiceSubscription): Promise<VoiceSubscription> {
    const [created] = await db.insert(voiceSubscriptions).values(sub).returning();
    return created;
  }

  async updateVoiceSubscription(businessId: string, updates: Partial<InsertVoiceSubscription>): Promise<VoiceSubscription | undefined> {
    const [updated] = await db
      .update(voiceSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voiceSubscriptions.businessId, businessId))
      .returning();
    return updated || undefined;
  }

  async incrementVoiceMinutes(businessId: string, minutes: number): Promise<void> {
    const sub = await this.getVoiceSubscription(businessId);
    if (sub) {
      await db
        .update(voiceSubscriptions)
        .set({
          minutesUsed: sub.minutesUsed + minutes,
          updatedAt: new Date(),
        })
        .where(eq(voiceSubscriptions.businessId, businessId));
    }
  }

  async checkVoiceMinutesAvailable(businessId: string): Promise<{ available: boolean; remainingMinutes: number }> {
    const sub = await this.getVoiceSubscription(businessId);
    if (!sub) {
      return { available: true, remainingMinutes: 5 }; // 5 minute free trial
    }
    const remaining = sub.minutesLimit - sub.minutesUsed;
    return {
      available: remaining > 0,
      remainingMinutes: Math.max(0, remaining),
    };
  }

  async getVoiceUsageStats(businessId: string): Promise<{ usedMinutes: number; totalMinutes: number }> {
    const sub = await this.getVoiceSubscription(businessId);
    if (!sub) {
      return { usedMinutes: 0, totalMinutes: 5 };
    }
    return {
      usedMinutes: sub.minutesUsed,
      totalMinutes: sub.minutesLimit,
    };
  }

  // Voice Call Logs
  async createVoiceCallLog(log: InsertVoiceCallLog): Promise<VoiceCallLog> {
    const [created] = await db.insert(voiceCallLogs).values(log).returning();
    return created;
  }

  async getVoiceCallLogs(businessId: string): Promise<VoiceCallLog[]> {
    return db.select().from(voiceCallLogs).where(eq(voiceCallLogs.businessId, businessId)).orderBy(desc(voiceCallLogs.createdAt));
  }

  // Demo Data
  async initializeDemoData(businessId: string, businessType: string = "salon"): Promise<void> {
    // Clear existing demo data before loading new type
    const existingServices = await this.getServices(businessId);
    if (existingServices.length > 0) {
      // Delete all existing services and their associated bookings and availability
      for (const service of existingServices) {
        await this.deleteService(service.id);
      }
      // Delete all customers and their bookings
      const existingCustomers = await this.getCustomers(businessId);
      for (const customer of existingCustomers) {
        // Delete bookings first (due to foreign key constraints)
        await db.delete(bookings).where(eq(bookings.customerId, customer.id));
        // Then delete customer
        await db.delete(customers).where(eq(customers.id, customer.id));
      }
      // Delete availability
      const existingAvailability = await this.getAvailability(businessId);
      for (const avail of existingAvailability) {
        await db.delete(availability).where(eq(availability.id, avail.id));
      }
    }

    const demoDataTemplates: Record<string, { name: string; services: any[]; customers: any[] }> = {
      salon: {
        name: "Signature Salon",
        services: [
          { name: "Express Glow", duration: 30, price: 4500, description: "Quick refresh for hair or skin" },
          { name: "Signature Beauty", duration: 60, price: 9500, description: "Our most popular beauty session" },
          { name: "Luxury Experience", duration: 120, price: 18000, description: "Premium, unhurried beauty care" },
          { name: "Deep Conditioning", duration: 45, price: 2500, description: "Scalp treatment and conditioning" },
        ],
        customers: [
          { name: "Emma Wilson", email: "delivered+emma@resend.dev", phone: "555-0101" },
          { name: "Olivia Chen", email: "delivered+olivia@resend.dev", phone: "555-0102" },
          { name: "Sophia Martinez", email: "delivered+sophia@resend.dev", phone: "555-0103" },
          { name: "Ava Johnson", email: "delivered+ava@resend.dev", phone: "555-0104" },
        ],
      },
      medical: {
        name: "Wellness Medical Clinic",
        services: [
          { name: "Initial Consultation", duration: 30, price: 9000, description: "First-time patient assessment" },
          { name: "Standard Treatment", duration: 60, price: 15000, description: "Routine medical or dental procedure" },
          { name: "Comprehensive Care", duration: 90, price: 24000, description: "Extended care session" },
          { name: "Follow-up Visit", duration: 20, price: 5000, description: "Post-treatment follow-up" },
        ],
        customers: [
          { name: "Michael Chen", email: "delivered+michael@resend.dev", phone: "555-0201" },
          { name: "Jennifer Lee", email: "delivered+jennifer@resend.dev", phone: "555-0202" },
          { name: "Robert Williams", email: "delivered+robert@resend.dev", phone: "555-0203" },
          { name: "Diana Brown", email: "delivered+diana@resend.dev", phone: "555-0204" },
        ],
      },
      autodetailing: {
        name: "Elite Auto Spa",
        services: [
          { name: "Interior Detail", duration: 90, price: 12000, description: "Deep clean of all interior surfaces" },
          { name: "Exterior Polish", duration: 120, price: 15000, description: "Premium wash and machine polish" },
          { name: "Full Ceramic", duration: 240, price: 45000, description: "Full correction and ceramic coating" },
          { name: "Express Wash", duration: 45, price: 4500, description: "Hand wash and vacuum" },
        ],
        customers: [
          { name: "James Bond", email: "delivered+james@resend.dev", phone: "555-0301" },
          { name: "Sarah Connor", email: "delivered+sarah@resend.dev", phone: "555-0302" },
          { name: "Bruce Wayne", email: "delivered+bruce@resend.dev", phone: "555-0303" },
          { name: "Ellen Ripley", email: "delivered+ellen@resend.dev", phone: "555-0304" },
        ],
      },
      fitness: {
        name: "Power Fitness Studio",
        services: [
          { name: "Personal Training", duration: 60, price: 8500, description: "One-on-one custom workout" },
          { name: "Small Group HIIT", duration: 45, price: 3500, description: "High intensity interval training" },
          { name: "Yoga Flow", duration: 75, price: 2500, description: "Guided Vinyasa session" },
          { name: "Nutrition Coaching", duration: 30, price: 5000, description: "Meal planning and strategy" },
        ],
        customers: [
          { name: "Rocky Balboa", email: "delivered+rocky@resend.dev", phone: "555-0401" },
          { name: "Lara Croft", email: "delivered+lara@resend.dev", phone: "555-0402" },
          { name: "Diana Prince", email: "delivered+diana@resend.dev", phone: "555-0403" },
          { name: "Steve Rogers", email: "delivered+steve@resend.dev", phone: "555-0404" },
        ],
      },
      coaching: {
        name: "Elite Coaching Academy",
        services: [
          { name: "Executive Coaching", duration: 60, price: 25000, description: "Leadership strategy for managers" },
          { name: "Life Strategy", duration: 90, price: 15000, description: "Personal development planning" },
          { name: "Career Transition", duration: 45, price: 9500, description: "Resume and interview prep" },
          { name: "Public Speaking", duration: 60, price: 12500, description: "Presence and delivery workshop" },
        ],
        customers: [
          { name: "Tony Robbins", email: "delivered+tony@resend.dev", phone: "555-0501" },
          { name: "Oprah Winfrey", email: "delivered+oprah@resend.dev", phone: "555-0502" },
          { name: "Simon Sinek", email: "delivered+simon@resend.dev", phone: "555-0503" },
          { name: "Brené Brown", email: "delivered+brene@resend.dev", phone: "555-0504" },
        ],
      },
      barbershop: {
        name: "Classic Cuts Barbershop",
        services: [
          { name: "Classic Haircut", duration: 30, price: 3500, description: "Traditional scissor or clipper cut" },
          { name: "Beard Trim & Shape", duration: 20, price: 2000, description: "Precision beard grooming and lineup" },
          { name: "Hot Towel Shave", duration: 45, price: 4500, description: "Straight razor shave with hot towels" },
          { name: "Haircut & Beard Combo", duration: 45, price: 5000, description: "Full haircut plus beard trim" },
        ],
        customers: [
          { name: "Marcus Johnson", email: "delivered+marcus@resend.dev", phone: "555-0601" },
          { name: "Derek Thompson", email: "delivered+derek@resend.dev", phone: "555-0602" },
          { name: "Carlos Rivera", email: "delivered+carlos@resend.dev", phone: "555-0603" },
          { name: "Andre Mitchell", email: "delivered+andre@resend.dev", phone: "555-0604" },
        ],
      },
      spa: {
        name: "Serenity Day Spa",
        services: [
          { name: "Swedish Massage", duration: 60, price: 9500, description: "Full-body relaxation massage" },
          { name: "Deep Tissue Massage", duration: 90, price: 13000, description: "Targeted pressure for tension relief" },
          { name: "Hydrating Facial", duration: 60, price: 8500, description: "Cleanse, exfoliate, and moisturize" },
          { name: "Couples Package", duration: 120, price: 22000, description: "Side-by-side massage and facial for two" },
        ],
        customers: [
          { name: "Lauren Mitchell", email: "delivered+lauren@resend.dev", phone: "555-0701" },
          { name: "Nicole Davis", email: "delivered+nicole@resend.dev", phone: "555-0702" },
          { name: "Rachel Kim", email: "delivered+rachel@resend.dev", phone: "555-0703" },
          { name: "Amanda Foster", email: "delivered+amanda@resend.dev", phone: "555-0704" },
        ],
      },
      yoga: {
        name: "Inner Flow Yoga Studio",
        services: [
          { name: "Vinyasa Flow", duration: 60, price: 2500, description: "Dynamic movement-breath class" },
          { name: "Hot Yoga", duration: 75, price: 3000, description: "Heated room power yoga session" },
          { name: "Private Session", duration: 60, price: 9500, description: "One-on-one personalized instruction" },
          { name: "Restorative Yoga", duration: 90, price: 2500, description: "Gentle stretching and deep relaxation" },
        ],
        customers: [
          { name: "Maya Patel", email: "delivered+maya@resend.dev", phone: "555-0801" },
          { name: "Claire Bennett", email: "delivered+claire@resend.dev", phone: "555-0802" },
          { name: "Zoe Nakamura", email: "delivered+zoe@resend.dev", phone: "555-0803" },
          { name: "Priya Sharma", email: "delivered+priya@resend.dev", phone: "555-0804" },
        ],
      },
      dental: {
        name: "Bright Smile Dental",
        services: [
          { name: "Dental Cleaning", duration: 45, price: 12000, description: "Professional teeth cleaning and polish" },
          { name: "Teeth Whitening", duration: 60, price: 35000, description: "In-office professional whitening" },
          { name: "Dental Exam & X-Rays", duration: 30, price: 8500, description: "Comprehensive oral examination" },
          { name: "Filling", duration: 45, price: 18000, description: "Composite tooth-colored filling" },
        ],
        customers: [
          { name: "David Park", email: "delivered+david@resend.dev", phone: "555-0901" },
          { name: "Lisa Nguyen", email: "delivered+lisa@resend.dev", phone: "555-0902" },
          { name: "Kevin O'Brien", email: "delivered+kevin@resend.dev", phone: "555-0903" },
          { name: "Susan Clark", email: "delivered+susan@resend.dev", phone: "555-0904" },
        ],
      },
      veterinary: {
        name: "Happy Paws Vet Clinic",
        services: [
          { name: "Wellness Exam", duration: 30, price: 6500, description: "Routine health checkup for your pet" },
          { name: "Vaccination Package", duration: 20, price: 8500, description: "Core vaccines and booster shots" },
          { name: "Dental Cleaning", duration: 60, price: 25000, description: "Professional pet dental cleaning" },
          { name: "Sick Visit", duration: 30, price: 7500, description: "Illness diagnosis and treatment plan" },
        ],
        customers: [
          { name: "Tom Henderson", email: "delivered+tom@resend.dev", phone: "555-1001" },
          { name: "Maria Garcia", email: "delivered+maria@resend.dev", phone: "555-1002" },
          { name: "Beth Cooper", email: "delivered+beth@resend.dev", phone: "555-1003" },
          { name: "Ryan Kelly", email: "delivered+ryan@resend.dev", phone: "555-1004" },
        ],
      },
      tattoo: {
        name: "Iron Canvas Tattoo",
        services: [
          { name: "Small Tattoo", duration: 60, price: 10000, description: "Simple design under 3 inches" },
          { name: "Medium Tattoo", duration: 120, price: 25000, description: "Detailed design 3-6 inches" },
          { name: "Large Tattoo Session", duration: 240, price: 50000, description: "Full session for large-scale work" },
          { name: "Consultation & Design", duration: 30, price: 5000, description: "Custom design planning session" },
        ],
        customers: [
          { name: "Jake Morrison", email: "delivered+jake@resend.dev", phone: "555-1101" },
          { name: "Mia Santos", email: "delivered+mia@resend.dev", phone: "555-1102" },
          { name: "Tyler Brooks", email: "delivered+tyler@resend.dev", phone: "555-1103" },
          { name: "Amber Reed", email: "delivered+amber@resend.dev", phone: "555-1104" },
        ],
      },
      massage: {
        name: "Healing Hands Massage",
        services: [
          { name: "Relaxation Massage", duration: 60, price: 8000, description: "Full-body stress relief massage" },
          { name: "Sports Massage", duration: 60, price: 9500, description: "Targeted recovery for athletes" },
          { name: "Prenatal Massage", duration: 60, price: 8500, description: "Gentle massage for expectant mothers" },
          { name: "Hot Stone Massage", duration: 90, price: 12000, description: "Heated stones for deep relaxation" },
        ],
        customers: [
          { name: "Karen White", email: "delivered+karen@resend.dev", phone: "555-1201" },
          { name: "Brian Hall", email: "delivered+brian@resend.dev", phone: "555-1202" },
          { name: "Jessica Moore", email: "delivered+jessica@resend.dev", phone: "555-1203" },
          { name: "Daniel Lee", email: "delivered+daniell@resend.dev", phone: "555-1204" },
        ],
      },
      photography: {
        name: "Lens & Light Studio",
        services: [
          { name: "Portrait Session", duration: 60, price: 15000, description: "Professional headshots or portraits" },
          { name: "Event Coverage", duration: 240, price: 75000, description: "Full event photography package" },
          { name: "Product Photography", duration: 120, price: 35000, description: "High-quality product shots" },
          { name: "Mini Session", duration: 30, price: 7500, description: "Quick session with 5 edited photos" },
        ],
        customers: [
          { name: "Ashley Turner", email: "delivered+ashley@resend.dev", phone: "555-1301" },
          { name: "Chris Evans", email: "delivered+chrise@resend.dev", phone: "555-1302" },
          { name: "Natalie Wood", email: "delivered+natalie@resend.dev", phone: "555-1303" },
          { name: "Sam Richardson", email: "delivered+samr@resend.dev", phone: "555-1304" },
        ],
      },
      tutoring: {
        name: "Bright Minds Tutoring",
        services: [
          { name: "Math Tutoring", duration: 60, price: 6500, description: "Algebra, geometry, or calculus help" },
          { name: "SAT/ACT Prep", duration: 90, price: 9500, description: "Test strategy and practice" },
          { name: "Essay Writing Help", duration: 60, price: 5500, description: "College essay or academic writing" },
          { name: "Science Tutoring", duration: 60, price: 6500, description: "Biology, chemistry, or physics" },
        ],
        customers: [
          { name: "Emily Zhang", email: "delivered+emily@resend.dev", phone: "555-1401" },
          { name: "Noah Adams", email: "delivered+noah@resend.dev", phone: "555-1402" },
          { name: "Chloe Bennett", email: "delivered+chloe@resend.dev", phone: "555-1403" },
          { name: "Ethan Ramirez", email: "delivered+ethan@resend.dev", phone: "555-1404" },
        ],
      },
      consulting: {
        name: "Apex Business Consulting",
        services: [
          { name: "Strategy Session", duration: 60, price: 20000, description: "Business strategy and growth planning" },
          { name: "Financial Review", duration: 90, price: 30000, description: "Financial health assessment" },
          { name: "Marketing Audit", duration: 60, price: 15000, description: "Digital marketing performance review" },
          { name: "Discovery Call", duration: 30, price: 0, description: "Free introductory consultation" },
        ],
        customers: [
          { name: "Richard Chang", email: "delivered+richard@resend.dev", phone: "555-1501" },
          { name: "Patricia Moore", email: "delivered+patricia@resend.dev", phone: "555-1502" },
          { name: "Andrew Kim", email: "delivered+andrew@resend.dev", phone: "555-1503" },
          { name: "Victoria Patel", email: "delivered+victoria@resend.dev", phone: "555-1504" },
        ],
      },
      cleaning: {
        name: "Sparkle Clean Services",
        services: [
          { name: "Standard Cleaning", duration: 120, price: 12000, description: "Regular home cleaning service" },
          { name: "Deep Clean", duration: 240, price: 25000, description: "Thorough top-to-bottom cleaning" },
          { name: "Move-In/Move-Out", duration: 300, price: 35000, description: "Complete property cleaning for moves" },
          { name: "Office Cleaning", duration: 120, price: 15000, description: "Professional workspace cleaning" },
        ],
        customers: [
          { name: "Sandra Phillips", email: "delivered+sandra@resend.dev", phone: "555-1601" },
          { name: "Mark Thompson", email: "delivered+markt@resend.dev", phone: "555-1602" },
          { name: "Linda Garcia", email: "delivered+linda@resend.dev", phone: "555-1603" },
          { name: "Paul Anderson", email: "delivered+paul@resend.dev", phone: "555-1604" },
        ],
      },
      plumbing: {
        name: "FlowRight Plumbing",
        services: [
          { name: "Drain Cleaning", duration: 60, price: 15000, description: "Clear clogged drains and pipes" },
          { name: "Leak Repair", duration: 90, price: 20000, description: "Fix pipe or faucet leaks" },
          { name: "Water Heater Service", duration: 120, price: 30000, description: "Repair or replace water heater" },
          { name: "Inspection & Estimate", duration: 30, price: 5000, description: "Plumbing system assessment" },
        ],
        customers: [
          { name: "George Miller", email: "delivered+george@resend.dev", phone: "555-1701" },
          { name: "Nancy Wilson", email: "delivered+nancy@resend.dev", phone: "555-1702" },
          { name: "Frank Lopez", email: "delivered+frank@resend.dev", phone: "555-1703" },
          { name: "Dorothy Harris", email: "delivered+dorothy@resend.dev", phone: "555-1704" },
        ],
      },
      electrical: {
        name: "Volt Electric Services",
        services: [
          { name: "Outlet & Switch Repair", duration: 60, price: 12000, description: "Fix or replace outlets and switches" },
          { name: "Panel Upgrade", duration: 240, price: 80000, description: "Electrical panel replacement" },
          { name: "Lighting Installation", duration: 90, price: 18000, description: "Install new light fixtures" },
          { name: "Safety Inspection", duration: 60, price: 10000, description: "Full home electrical inspection" },
        ],
        customers: [
          { name: "Walter Scott", email: "delivered+walter@resend.dev", phone: "555-1801" },
          { name: "Helen Baker", email: "delivered+helen@resend.dev", phone: "555-1802" },
          { name: "Roy Martinez", email: "delivered+roy@resend.dev", phone: "555-1803" },
          { name: "Carol Young", email: "delivered+carol@resend.dev", phone: "555-1804" },
        ],
      },
      hvac: {
        name: "ComfortZone HVAC",
        services: [
          { name: "AC Tune-Up", duration: 60, price: 12000, description: "Seasonal air conditioning maintenance" },
          { name: "Furnace Repair", duration: 120, price: 25000, description: "Diagnose and fix heating issues" },
          { name: "Duct Cleaning", duration: 180, price: 35000, description: "Full air duct cleaning service" },
          { name: "System Installation", duration: 480, price: 150000, description: "New HVAC system installation" },
        ],
        customers: [
          { name: "Bill Robinson", email: "delivered+bill@resend.dev", phone: "555-1901" },
          { name: "Janet Lewis", email: "delivered+janet@resend.dev", phone: "555-1902" },
          { name: "Harold Wright", email: "delivered+harold@resend.dev", phone: "555-1903" },
          { name: "Ruth Adams", email: "delivered+ruth@resend.dev", phone: "555-1904" },
        ],
      },
      landscaping: {
        name: "GreenScape Landscaping",
        services: [
          { name: "Lawn Mowing", duration: 60, price: 5000, description: "Weekly lawn mowing and edging" },
          { name: "Garden Design", duration: 120, price: 25000, description: "Custom garden planning and planting" },
          { name: "Tree Trimming", duration: 120, price: 20000, description: "Professional tree and shrub pruning" },
          { name: "Spring Cleanup", duration: 180, price: 30000, description: "Full yard cleanup and mulching" },
        ],
        customers: [
          { name: "Greg Palmer", email: "delivered+greg@resend.dev", phone: "555-2001" },
          { name: "Diane Foster", email: "delivered+diane@resend.dev", phone: "555-2002" },
          { name: "Steve Morgan", email: "delivered+stevem@resend.dev", phone: "555-2003" },
          { name: "Betty Hughes", email: "delivered+betty@resend.dev", phone: "555-2004" },
        ],
      },
    };

    const template = demoDataTemplates[businessType] || demoDataTemplates.salon;

    // Create services and default availability
    for (const svc of template.services) {
      await this.createService({ ...svc, businessId });
    }

    for (const cust of template.customers) {
      await this.createCustomer({ ...cust, businessId });
    }

    // Create default availability (Mon-Fri 9-5, Sat 10-2)
    for (let day = 1; day <= 5; day++) {
      await this.setAvailability({ businessId, dayOfWeek: day, startTime: "09:00", endTime: "17:00", isActive: true });
    }
    await this.setAvailability({ businessId, dayOfWeek: 6, startTime: "10:00", endTime: "14:00", isActive: true });
    await this.setAvailability({ businessId, dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isActive: false });
  }

  async clearAllData(businessId: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.businessId, businessId));
    await db.delete(services).where(eq(services.businessId, businessId));
    await db.delete(customers).where(eq(customers.businessId, businessId));
    await db.delete(availability).where(eq(availability.businessId, businessId));
    await db.delete(blockedSlots).where(eq(blockedSlots.businessId, businessId));
    await db.delete(trainingData).where(eq(trainingData.businessId, businessId));
  }
}

export const storage = new DatabaseStorage();
