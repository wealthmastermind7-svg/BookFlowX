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

  async updateBusiness(id: string, updates: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [updated] = await db
      .update(businesses)
      .set({ ...updates, updatedAt: new Date() })
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

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db
      .update(services)
      .set(updates)
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
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        paymentStatus: bookings.paymentStatus,
        stripePaymentIntentId: bookings.stripePaymentIntentId,
        stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
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
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        paymentStatus: bookings.paymentStatus,
        stripePaymentIntentId: bookings.stripePaymentIntentId,
        stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
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
        const customerBookings = await db
          .delete(bookings)
          .where(eq(bookings.customerId, customer.id));
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
          { name: "Emma Wilson", email: "emma-salon@example.com", phone: "555-0101" },
          { name: "Olivia Chen", email: "olivia-salon@example.com", phone: "555-0102" },
          { name: "Sophia Martinez", email: "sophia-salon@example.com", phone: "555-0103" },
          { name: "Ava Johnson", email: "ava-salon@example.com", phone: "555-0104" },
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
          { name: "Michael Chen", email: "michael-med@example.com", phone: "555-0201" },
          { name: "Jennifer Lee", email: "jennifer-med@example.com", phone: "555-0202" },
          { name: "Robert Williams", email: "robert-med@example.com", phone: "555-0203" },
          { name: "Diana Brown", email: "diana-med@example.com", phone: "555-0204" },
        ],
      },
      autodetailing: {
        name: "Premium Auto Detail",
        services: [
          { name: "Express Exterior", duration: 40, price: 4900, description: "Fast exterior refresh" },
          { name: "Gold Detail", duration: 75, price: 8900, description: "Interior + exterior clean" },
          { name: "Platinum Detail", duration: 120, price: 14900, description: "Deep detail with protection" },
          { name: "Pet Hair Removal", duration: 30, price: 4000, description: "Specialized pet hair removal" },
        ],
        customers: [
          { name: "James Rodriguez", email: "james-auto@example.com", phone: "555-0301" },
          { name: "Patricia Taylor", email: "patricia-auto@example.com", phone: "555-0302" },
          { name: "Christopher Garcia", email: "chris-auto@example.com", phone: "555-0303" },
          { name: "Nancy Davis", email: "nancy-auto@example.com", phone: "555-0304" },
        ],
      },
      fitness: {
        name: "FitZone Gym",
        services: [
          { name: "Single Training Session", duration: 60, price: 7500, description: "One-on-one personal training" },
          { name: "Transformation Pack", duration: 60, price: 6500, description: "Best value training package (5 sessions)" },
          { name: "Elite Coaching", duration: 90, price: 12000, description: "Advanced performance coaching" },
          { name: "Group Fitness Class", duration: 45, price: 2500, description: "Led fitness class" },
        ],
        customers: [
          { name: "Andrew Jackson", email: "andrew-fit@example.com", phone: "555-0401" },
          { name: "Susan Miller", email: "susan-fit@example.com", phone: "555-0402" },
          { name: "Thomas Moore", email: "thomas-fit@example.com", phone: "555-0403" },
          { name: "Betty Anderson", email: "betty-fit@example.com", phone: "555-0404" },
        ],
      },
      coaching: {
        name: "Elite Coaching Academy",
        services: [
          { name: "Quick Help Session", duration: 30, price: 4000, description: "Targeted help on one topic" },
          { name: "Standard Coaching", duration: 60, price: 7000, description: "Structured learning session" },
          { name: "Exam Prep Intensive", duration: 90, price: 11000, description: "High-impact exam preparation" },
          { name: "Monthly Membership", duration: 2880, price: 35000, description: "Unlimited access to all sessions" },
        ],
        customers: [
          { name: "David Thompson", email: "david-coach@example.com", phone: "555-0501" },
          { name: "Karen White", email: "karen-coach@example.com", phone: "555-0502" },
          { name: "Steven Harris", email: "steven-coach@example.com", phone: "555-0503" },
          { name: "Mary Clark", email: "mary-coach@example.com", phone: "555-0504" },
        ],
      },
      photography: {
        name: "Studio Lens Photography",
        services: [
          { name: "Mini Shoot", duration: 30, price: 9900, description: "Quick professional photo session" },
          { name: "Standard Studio Session", duration: 60, price: 18000, description: "Portrait or branding shoot" },
          { name: "Premium Creative Session", duration: 120, price: 32000, description: "Styled, high-end photo experience" },
          { name: "Retouching Package", duration: 30, price: 5000, description: "Professional photo retouching" },
        ],
        customers: [
          { name: "Lisa Anderson", email: "lisa-photo@example.com", phone: "555-0601" },
          { name: "Kevin Martin", email: "kevin-photo@example.com", phone: "555-0602" },
          { name: "Rachel Green", email: "rachel-photo@example.com", phone: "555-0603" },
          { name: "Jason Hall", email: "jason-photo@example.com", phone: "555-0604" },
        ],
      },
      consulting: {
        name: "Strategy Consulting Partners",
        services: [
          { name: "Discovery Call", duration: 30, price: 6000, description: "Initial consultation" },
          { name: "Strategy Session", duration: 60, price: 12000, description: "Deep-dive business session" },
          { name: "Implementation Workshop", duration: 120, price: 24000, description: "Hands-on execution support" },
          { name: "Quarterly Review", duration: 90, price: 18000, description: "Progress review and planning" },
        ],
        customers: [
          { name: "Daniel Scott", email: "daniel-cons@example.com", phone: "555-0701" },
          { name: "Rebecca King", email: "rebecca-cons@example.com", phone: "555-0702" },
          { name: "Matthew Wright", email: "matthew-cons@example.com", phone: "555-0703" },
          { name: "Megan Lopez", email: "megan-cons@example.com", phone: "555-0704" },
        ],
      },
      veterinary: {
        name: "Happy Paws Veterinary",
        services: [
          { name: "General Check-Up", duration: 30, price: 8500, description: "Routine health examination" },
          { name: "Vaccination Visit", duration: 20, price: 6500, description: "Scheduled vaccinations" },
          { name: "Comprehensive Wellness Exam", duration: 60, price: 16000, description: "Full pet health assessment" },
          { name: "Dental Cleaning", duration: 45, price: 12000, description: "Professional pet dental care" },
        ],
        customers: [
          { name: "Sarah Collins", email: "sarah-vet@example.com", phone: "555-0801" },
          { name: "Mark Hill", email: "mark-vet@example.com", phone: "555-0802" },
          { name: "Lauren Young", email: "lauren-vet@example.com", phone: "555-0803" },
          { name: "Eric Stewart", email: "eric-vet@example.com", phone: "555-0804" },
        ],
      },
    };

    const template = demoDataTemplates[businessType] || demoDataTemplates.salon;

    try {
      // Create demo services
      const demoServices = template.services.map(s => ({
        businessId,
        name: s.name,
        duration: s.duration,
        price: s.price,
        description: s.description,
      }));

      const createdServices: Service[] = [];
      for (const service of demoServices) {
        const created = await this.createService(service);
        createdServices.push(created);
      }

      // Create demo customers with unique identifiers
      const timestamp = Date.now();
      const demoCustomers = template.customers.map(c => ({
        businessId,
        name: c.name,
        email: `${c.email.split("@")[0]}-${timestamp}@example.com`,
        phone: c.phone,
      }));

      const createdCustomers: Customer[] = [];
      for (const customer of demoCustomers) {
        const created = await this.createCustomer(customer);
        createdCustomers.push(created);
      }

      // Create demo bookings
      const today = new Date();
      const demoBookings = [
        {
          businessId,
          customerId: createdCustomers[0].id,
          serviceId: createdServices[0].id,
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "10:00 AM",
          status: "confirmed",
          totalPrice: createdServices[0].price,
        },
        {
          businessId,
          customerId: createdCustomers[1].id,
          serviceId: createdServices[1].id,
          date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "2:00 PM",
          status: "pending",
          totalPrice: createdServices[1].price,
        },
        {
          businessId,
          customerId: createdCustomers[2].id,
          serviceId: createdServices[0].id,
          date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "11:00 AM",
          status: "confirmed",
          totalPrice: createdServices[0].price,
        },
      ];

      for (const booking of demoBookings) {
        await this.createBooking(booking);
      }

      // Create default availability (Monday-Friday, 9am-5pm)
      for (let day = 1; day <= 5; day++) {
        await this.setAvailability({
          businessId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        });
      }
    } catch (error) {
      console.error("Error in initializeDemoData:", error);
      throw error;
    }
  }

  // Quick Sales
  async getQuickSales(businessId: string): Promise<QuickSale[]> {
    return db
      .select()
      .from(quickSales)
      .where(eq(quickSales.businessId, businessId))
      .orderBy(desc(quickSales.createdAt));
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

  // Clear All Data
  async clearAllData(businessId: string): Promise<void> {
    try {
      // Delete in proper order due to foreign key constraints
      // 1. Delete all bookings first
      await db.delete(bookings).where(eq(bookings.businessId, businessId));

      // 2. Delete all customers
      await db.delete(customers).where(eq(customers.businessId, businessId));

      // 3. Delete all services
      await db.delete(services).where(eq(services.businessId, businessId));

      // 4. Delete all availability
      await db.delete(availability).where(eq(availability.businessId, businessId));

      // 5. Delete all quick sales
      await db.delete(quickSales).where(eq(quickSales.businessId, businessId));
    } catch (error) {
      console.error("Error clearing all data:", error);
      throw error;
    }
  }

  // Workflows
  async getWorkflows(businessId: string): Promise<Workflow[]> {
    return db
      .select()
      .from(workflows)
      .where(eq(workflows.businessId, businessId))
      .orderBy(desc(workflows.createdAt));
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow || undefined;
  }

  async getWorkflowsByTrigger(businessId: string, triggerType: string): Promise<Workflow[]> {
    return db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.businessId, businessId),
          eq(workflows.triggerType, triggerType),
          eq(workflows.isActive, true)
        )
      );
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
    const [theme] = await db
      .select()
      .from(businessThemes)
      .where(eq(businessThemes.businessId, businessId));
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
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.businessId, businessId))
      .orderBy(desc(apiKeys.createdAt));
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
    return db
      .select()
      .from(workflowLogs)
      .where(eq(workflowLogs.workflowId, workflowId))
      .orderBy(desc(workflowLogs.createdAt));
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
    // Delete workflow logs first due to foreign key constraints
    const businessWorkflows = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.businessId, businessId));
    
    for (const wf of businessWorkflows) {
      await db.delete(workflowLogs).where(eq(workflowLogs.workflowId, wf.id));
    }
    
    // Delete the workflows
    await db.delete(workflows).where(eq(workflows.businessId, businessId));
  }
}

export const storage = new DatabaseStorage();
