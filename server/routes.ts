import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { storage } from "./storage";
import { 
  insertBusinessSchema, 
  insertServiceSchema, 
  insertCustomerSchema, 
  insertBookingSchema,
  insertPushTokenSchema,
} from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { sendBookingConfirmation } from "./email";
import { sendBookingNotification, sendTestNotification } from "./notifications";
import { 
  verifyBusinessOwnership, 
  verifyServiceOwnership, 
  verifyBookingOwnership,
  verifyCustomerOwnership,
  type AuthenticatedRequest 
} from "./middleware/auth";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load booking HTML into memory for production reliability
let bookingHtmlContent: string = "";
let embedHtmlContent: string = "";
let embedJsContent: string = "";

async function loadBookingHtml() {
  const paths = [
    path.resolve(__dirname, "templates/booking.html"),
    path.resolve(process.cwd(), "server/templates/booking.html"),
    path.resolve(process.cwd(), "templates/booking.html"),
  ];
  
  for (const p of paths) {
    try {
      bookingHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded booking.html from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load booking.html. Paths tried:", paths);
}

async function loadEmbedHtml() {
  const paths = [
    path.resolve(__dirname, "templates/embed.html"),
    path.resolve(process.cwd(), "server/templates/embed.html"),
    path.resolve(process.cwd(), "templates/embed.html"),
  ];
  
  for (const p of paths) {
    try {
      embedHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded embed.html from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load embed.html. Paths tried:", paths);
}

async function loadEmbedJs() {
  const paths = [
    path.resolve(__dirname, "static/embed.js"),
    path.resolve(process.cwd(), "server/static/embed.js"),
    path.resolve(process.cwd(), "static/embed.js"),
  ];
  
  for (const p of paths) {
    try {
      embedJsContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded embed.js from: ${p}`);
      return;
    } catch {}
  }
  
  console.warn("Warning: Could not load embed.js. Paths tried:", paths);
}

function getEmbedOrigin(req: Request): string {
  // API_DOMAIN is set at runtime for production deployments
  const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && !domain.includes('localhost')) {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/:5000$/, '');
    return `https://${cleanDomain}`;
  }
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

// Helper function to generate booking URL
function getBookingUrlForBusiness(business: any, req: Request): string {
  // API_DOMAIN is set at runtime for production deployments
  const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && !domain.includes('localhost')) {
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    return `https://${cleanDomain}/book/${business.slug}`;
  } else {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol;
    return `${protocol}://${host}/book/${business.slug}`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Load templates at startup
  await loadBookingHtml();
  await loadEmbedHtml();
  await loadEmbedJs();
  
  // === BUSINESSES API ===
  
  // Get business by ID (for admin dashboard)
  app.get("/api/businesses/:id", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        // Try by slug as fallback for backwards compatibility
        const bySlug = await storage.getBusinessBySlug(req.params.id);
        if (!bySlug) {
          return res.status(404).json({ error: "Business not found" });
        }
        const bookingUrl = getBookingUrlForBusiness(bySlug, req);
        return res.json({ ...bySlug, bookingUrl });
      }
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.json({ ...business, bookingUrl });
    } catch (error) {
      console.error("Error getting business:", error);
      res.status(500).json({ error: "Failed to get business" });
    }
  });

  // Create business
  app.post("/api/businesses", async (req: Request, res: Response) => {
    try {
      const data = insertBusinessSchema.parse(req.body);
      
      // Check if business with this slug already exists
      const existing = await storage.getBusinessBySlug(data.slug);
      if (existing) {
        const bookingUrl = getBookingUrlForBusiness(existing, req);
        return res.status(201).json({ ...existing, bookingUrl });
      }
      
      const business = await storage.createBusiness(data);
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.status(201).json({ ...business, bookingUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating business:", error);
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Update business (PROTECTED)
  app.patch("/api/businesses/:id", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertBusinessSchema.partial().parse(req.body);
      const business = await storage.updateBusiness(req.params.id, updates);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.json({ ...business, bookingUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating business:", error);
      res.status(500).json({ error: "Failed to update business" });
    }
  });

  // === SERVICES API ===
  
  // Get services for a business (public)
  app.get("/api/businesses/:businessId/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getServices(req.params.businessId);
      res.json(services);
    } catch (error) {
      console.error("Error getting services:", error);
      res.status(500).json({ error: "Failed to get services" });
    }
  });

  // Get single service
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error getting service:", error);
      res.status(500).json({ error: "Failed to get service" });
    }
  });

  // Create service (PROTECTED)
  app.post("/api/businesses/:businessId/services", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertServiceSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  // Update service (PROTECTED)
  app.patch("/api/services/:id", verifyServiceOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, updates);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  // Delete service (PROTECTED)
  app.delete("/api/services/:id", verifyServiceOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // === CUSTOMERS API ===
  
  // Get customers for a business
  app.get("/api/businesses/:businessId/customers", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers(req.params.businessId);
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).json({ error: "Failed to get customers" });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error getting customer:", error);
      res.status(500).json({ error: "Failed to get customer" });
    }
  });

  // Create customer (public - for booking flow)
  app.post("/api/businesses/:businessId/customers", async (req: Request, res: Response) => {
    try {
      // Check if customer already exists by email
      const existing = await storage.getCustomerByEmail(req.params.businessId, req.body.email);
      if (existing) {
        return res.json(existing);
      }
      
      const data = insertCustomerSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Update customer (PROTECTED)
  app.patch("/api/customers/:id", verifyCustomerOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, updates);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // === BOOKINGS API ===
  
  // Get bookings for a business
  app.get("/api/businesses/:businessId/bookings", async (req: Request, res: Response) => {
    try {
      const { date } = req.query;
      let bookings;
      if (date && typeof date === "string") {
        bookings = await storage.getBookingsByDate(req.params.businessId, date);
      } else {
        bookings = await storage.getBookings(req.params.businessId);
      }
      res.json(bookings);
    } catch (error) {
      console.error("Error getting bookings:", error);
      res.status(500).json({ error: "Failed to get bookings" });
    }
  });

  // Get single booking
  app.get("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error getting booking:", error);
      res.status(500).json({ error: "Failed to get booking" });
    }
  });

  // Create booking (public - for booking flow)
  app.post("/api/businesses/:businessId/bookings", async (req: Request, res: Response) => {
    try {
      const data = insertBookingSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const booking = await storage.createBooking(data);
      
      // Get business and service for notifications
      const business = await storage.getBusiness(req.params.businessId);
      const service = await storage.getService(data.serviceId);
      const customerName = req.body.customerName || "Customer";
      const serviceName = service?.name || "Service";
      
      // Send email confirmation
      if (req.body.customerEmail && req.body.customerName) {
        sendBookingConfirmation({
          customerName: req.body.customerName,
          customerEmail: req.body.customerEmail,
          serviceName,
          date: data.date,
          time: data.time,
          price: data.totalPrice,
          confirmationNumber: booking.id.slice(0, 8).toUpperCase(),
          businessName: business?.name || "Business"
        }).catch(err => console.error("Failed to send confirmation email:", err));
      }
      
      // Send push notification to business owner (if notifications are enabled)
      if (business?.notificationsEnabled) {
        sendBookingNotification(
          req.params.businessId,
          customerName,
          serviceName,
          data.date,
          data.time
        ).catch(err => console.error("Failed to send push notification:", err));
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Update booking (PROTECTED)
  app.patch("/api/bookings/:id", verifyBookingOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(req.params.id, updates);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating booking:", error);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // === AVAILABILITY API ===
  
  // Get availability for a business
  app.get("/api/businesses/:businessId/availability", async (req: Request, res: Response) => {
    try {
      const availability = await storage.getAvailability(req.params.businessId);
      res.json(availability);
    } catch (error) {
      console.error("Error getting availability:", error);
      res.status(500).json({ error: "Failed to get availability" });
    }
  });

  // Set/update availability for a specific day (PROTECTED)
  app.put("/api/businesses/:businessId/availability/:dayOfWeek", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startTime, endTime, isActive } = req.body;
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: "Invalid day of week (must be 0-6)" });
      }
      
      const availability = await storage.updateOrCreateAvailability({
        businessId: req.params.businessId,
        dayOfWeek,
        startTime: startTime || "09:00",
        endTime: endTime || "17:00",
        isActive: isActive !== undefined ? isActive : true,
      });
      
      res.json(availability);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Bulk update availability (set all days at once) (PROTECTED)
  app.put("/api/businesses/:businessId/availability", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { schedules } = req.body;
      
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: "Schedules must be an array" });
      }
      
      const results = [];
      for (const schedule of schedules) {
        const availability = await storage.updateOrCreateAvailability({
          businessId: req.params.businessId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime || "09:00",
          endTime: schedule.endTime || "17:00",
          isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        });
        results.push(availability);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Get available time slots for a specific date
  app.get("/api/businesses/:businessId/slots/:date", async (req: Request, res: Response) => {
    try {
      const { businessId, date } = req.params;
      const { serviceId } = req.query;
      
      // Get business availability settings
      const availability = await storage.getAvailability(businessId);
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      
      // Find availability for this day
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek && a.isActive);
      
      if (!dayAvailability) {
        return res.json({ slots: [], message: "Business is closed on this day" });
      }
      
      // Get existing bookings for this date
      const bookings = await storage.getBookingsByDate(businessId, date);
      const bookedTimes = bookings.map(b => b.time);
      
      // Generate time slots
      const slots = [];
      const [startHour] = dayAvailability.startTime.split(":").map(Number);
      const [endHour] = dayAvailability.endTime.split(":").map(Number);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
        const time30 = `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? "PM" : "AM"}`;
        
        slots.push({
          time,
          available: !bookedTimes.includes(time),
        });
        slots.push({
          time: time30,
          available: !bookedTimes.includes(time30),
        });
      }
      
      res.json({ slots });
    } catch (error) {
      console.error("Error getting slots:", error);
      res.status(500).json({ error: "Failed to get slots" });
    }
  });

  // === DEMO DATA ===
  
  // Initialize demo data for a business (PROTECTED)
  app.post("/api/businesses/:businessId/demo-data", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessType = "salon" } = req.body;
      await storage.initializeDemoData(req.params.businessId, businessType);
      res.json({ message: "Demo data initialized" });
    } catch (error) {
      console.error("Error initializing demo data:", error);
      res.status(500).json({ error: "Failed to initialize demo data" });
    }
  });

  // === STATS API ===
  
  // Get dashboard stats for a business
  app.get("/api/businesses/:businessId/stats", async (req: Request, res: Response) => {
    try {
      const bookings = await storage.getBookings(req.params.businessId);
      const customers = await storage.getCustomers(req.params.businessId);
      const services = await storage.getServices(req.params.businessId);
      
      const totalRevenue = bookings
        .filter(b => b.status === "completed" || b.status === "confirmed")
        .reduce((sum, b) => sum + b.totalPrice, 0);
      
      const today = new Date().toISOString().split("T")[0];
      const todayBookings = bookings.filter(b => b.date === today);
      
      // Weekly revenue (last 7 days)
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const revenue = dayBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        weeklyData.push({
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          revenue: revenue / 100,
        });
      }
      
      res.json({
        totalRevenue: totalRevenue / 100,
        totalBookings: bookings.length,
        totalCustomers: customers.length,
        totalServices: services.length,
        todayBookings: todayBookings.length,
        weeklyData,
        recentBookings: bookings.slice(0, 5),
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // === PUSH TOKENS API ===
  
  // Register push token
  app.post("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const data = insertPushTokenSchema.parse(req.body);
      const pushToken = await storage.createPushToken(data);
      res.status(201).json(pushToken);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  // Delete push token
  app.delete("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const { token, businessId } = req.body;
      if (!token || !businessId) {
        return res.status(400).json({ error: "Token and businessId are required" });
      }
      await storage.deletePushToken(token, businessId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting push token:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  // Get push token count for a business (returns count only, not tokens for security)
  app.get("/api/businesses/:businessId/push-tokens", async (req: Request, res: Response) => {
    try {
      const tokens = await storage.getPushTokens(req.params.businessId);
      res.json({ 
        count: tokens.length,
        devices: tokens.map(t => ({ 
          platform: t.platform, 
          deviceName: t.deviceName,
          createdAt: t.createdAt 
        }))
      });
    } catch (error) {
      console.error("Error getting push tokens:", error);
      res.status(500).json({ error: "Failed to get push tokens" });
    }
  });

  // Send test notification
  app.post("/api/businesses/:businessId/test-notification", async (req: Request, res: Response) => {
    try {
      const result = await sendTestNotification(req.params.businessId);
      res.json(result);
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // === QR CODE API ===
  
  // Generate QR code for booking link
  app.get("/api/businesses/:businessId/qrcode", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      // Use helper function to generate booking URL
      const bookingUrl = getBookingUrlForBusiness(business, req);
      
      // Check if requesting as image (PNG) or JSON
      const format = req.query.format || 'json';
      
      if (format === 'image' || format === 'png') {
        // Return as PNG image file for direct download/sharing
        const qrCodeBuffer = await new Promise<Buffer>((resolve, reject) => {
          QRCode.toBuffer(bookingUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
          });
        });
        
        res.type('image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${business.slug}-booking-qr.png"`);
        res.send(qrCodeBuffer);
      } else {
        // Return as JSON with base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        res.json({ 
          qrCode: qrCodeDataUrl,
          bookingUrl,
          qrImageUrl: `/api/businesses/${business.id}/qrcode?format=image`
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // === PUBLIC BOOKING PAGE ===
  
  // Serve OG image (simple placeholder)
  app.get("/og-image.png", (req: Request, res: Response) => {
    // Return a simple SVG image as PNG fallback
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#000000"/>
      <text x="600" y="315" font-size="72" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-family="Arial">
        BookFlow
      </text>
      <text x="600" y="400" font-size="36" text-anchor="middle" fill="#9E9E9E" font-family="Arial">
        Book Your Appointment
      </text>
    </svg>`;
    
    res.type("image/svg+xml").send(svg);
  });
  
  // Helper function to generate Open Graph meta tags
  function generateOpenGraphMeta(business: any, service?: any, req?: Request): string {
    // Determine the base URL - use env domain if set, otherwise use request host
    let baseUrl = '';
    const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
    
    if (domain) {
      // Clean up the domain and add https
      const cleanDomain = domain.replace(/^https?:\/\//, '');
      baseUrl = `https://${cleanDomain}`;
    } else if (req) {
      // Fallback to request host
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'https';
      baseUrl = `${protocol}://${host}`;
    } else {
      baseUrl = 'https://localhost:5000';
    }
    
    const title = service ? `${service.name} - ${business.name}` : `Book with ${business.name}`;
    const description = service 
      ? `Schedule your ${service.name} appointment instantly. No calls required.`
      : `Book an appointment with ${business.name}. Fast, easy, and secure booking.`;
    
    // Use OG image from assets
    const ogImage = `${baseUrl}/assets/og/booking-preview.png`;
    
    return `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/book/${business.slug}" />
    <meta property="og:site_name" content="BookFlow" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="BookFlow" />`;
  }
  
  // Serve public booking page (client-side routing)
  app.get("/book/:slug", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const services = await storage.getServices(business.id);
      const firstService = services && services.length > 0 ? services[0] : undefined;
      
      const ogMeta = generateOpenGraphMeta(business, firstService, req);
      
      // Insert Open Graph meta tags into the HTML before the closing </head> tag
      const htmlWithMeta = bookingHtmlContent.replace(
        '</head>',
        `${ogMeta}\n  </head>`
      );
      
      res.type("text/html").send(htmlWithMeta);
    } catch (error) {
      console.error("Error serving booking page:", error);
      if (bookingHtmlContent) {
        res.type("text/html").send(bookingHtmlContent);
      } else {
        res.status(500).json({ error: "Booking page not available" });
      }
    }
  });
  
  app.get("/book/:slug/*", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const services = await storage.getServices(business.id);
      const firstService = services && services.length > 0 ? services[0] : undefined;
      
      const ogMeta = generateOpenGraphMeta(business, firstService, req);
      
      // Insert Open Graph meta tags into the HTML before the closing </head> tag
      const htmlWithMeta = bookingHtmlContent.replace(
        '</head>',
        `${ogMeta}\n  </head>`
      );
      
      res.type("text/html").send(htmlWithMeta);
    } catch (error) {
      console.error("Error serving booking page:", error);
      if (bookingHtmlContent) {
        res.type("text/html").send(bookingHtmlContent);
      } else {
        res.status(500).json({ error: "Booking page not available" });
      }
    }
  });

  // === EMBED WIDGET ===
  
  // Serve embeddable booking widget (iframe-friendly)
  app.get("/embed/:slug", (req: Request, res: Response) => {
    if (embedHtmlContent) {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *;");
      res.type("text/html").send(embedHtmlContent);
    } else {
      res.status(500).json({ error: "Embed widget not available" });
    }
  });
  
  // Serve embed.js loader script
  app.get("/embed.js", (req: Request, res: Response) => {
    if (embedJsContent) {
      const origin = getEmbedOrigin(req);
      const jsWithOrigin = embedJsContent.replace(/\{\{EMBED_ORIGIN\}\}/g, origin);
      res.type("application/javascript").send(jsWithOrigin);
    } else {
      res.status(500).json({ error: "Embed script not available" });
    }
  });

  // Get embed code snippets for a business
  app.get("/api/businesses/:businessId/embed-code", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const origin = getEmbedOrigin(req);
      const embedUrl = `${origin}/embed/${business.slug}`;
      const scriptUrl = `${origin}/embed.js`;
      
      const buttonText = (req.query.buttonText as string) || 'Book Now';
      const buttonColor = (req.query.buttonColor as string) || '#000000';
      
      const inlineCode = `<!-- BookFlow Inline Widget -->
<div id="bookflow-widget"></div>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'inline',
    container: '#bookflow-widget'
  });
</script>`;

      const popupButtonCode = `<!-- BookFlow Popup Button -->
<div id="bookflow-button"></div>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'popup-button',
    container: '#bookflow-button',
    buttonText: '${buttonText}',
    buttonColor: '${buttonColor}'
  });
</script>`;

      const popupTextCode = `<!-- BookFlow Popup Text Link -->
<span id="bookflow-link"></span>
<script src="${scriptUrl}"></script>
<script>
  new BookFlowWidget({
    businessSlug: '${business.slug}',
    type: 'popup-text',
    container: '#bookflow-link',
    buttonText: '${buttonText}',
    buttonColor: '${buttonColor}'
  });
</script>`;

      res.json({
        embedUrl,
        scriptUrl,
        inlineCode,
        popupButtonCode,
        popupTextCode,
        businessSlug: business.slug
      });
    } catch (error) {
      console.error("Error generating embed code:", error);
      res.status(500).json({ error: "Failed to generate embed code" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
