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
import sharp from "sharp";
import { sendBookingConfirmation } from "./email";
import { sendBookingNotification, sendTestNotification } from "./notifications";
import { 
  verifyBusinessOwnership, 
  verifyServiceOwnership, 
  verifyBookingOwnership,
  verifyCustomerOwnership,
  type AuthenticatedRequest 
} from "./middleware/auth";
import { triggerWorkflows, initializeIndustryBlueprints, INDUSTRY_BLUEPRINTS } from "./workflowEngine";
import { insertWorkflowSchema, insertBusinessThemeSchema } from "@shared/schema";
import crypto from "crypto";
import { 
  buildBookingContext, 
  getSmartUpsellSuggestion, 
  getDynamicMessage,
  getRevenueInsightExplanation,
  INDUSTRY_CONTEXT,
  type BookingContext 
} from "./context4all";
import { 
  getVoiceAgentConfig, 
  voiceAgentRespond, 
  createVoiceAgentWelcome 
} from "./voiceAgent";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  hasBusinessCalendar,
  disconnectGoogleCalendar,
} from "./googleCalendar";
import { trainingData, insertTrainingDataSchema } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import express from "express";
import { convertWebmToWav } from "./replit_integrations/audio/client";
import { getUncachableStripeClient } from "./stripeClient";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load booking HTML into memory for production reliability
let bookingHtmlContent: string = "";
let expiredHtmlContent: string = "";
let embedHtmlContent: string = "";
let embedJsContent: string = "";
let voiceAgentHtmlContent: string = "";
let voiceAgentVapiHtmlContent: string = "";
let voiceBookingHtmlContent: string = "";

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
      break;
    } catch {}
  }
  
  const expiredPaths = [
    path.resolve(__dirname, "templates/expired.html"),
    path.resolve(process.cwd(), "server/templates/expired.html"),
  ];
  for (const p of expiredPaths) {
    try {
      expiredHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded expired.html from: ${p}`);
      break;
    } catch {}
  }
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

async function loadVoiceAgentHtml() {
  const paths = [
    path.resolve(__dirname, "templates/voice-agent.html"),
    path.resolve(process.cwd(), "server/templates/voice-agent.html"),
    path.resolve(process.cwd(), "templates/voice-agent.html"),
  ];
  
  for (const p of paths) {
    try {
      voiceAgentHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded voice-agent.html from: ${p}`);
      break;
    } catch {}
  }
  
  if (!voiceAgentHtmlContent) {
    console.warn("Warning: Could not load voice-agent.html. Paths tried:", paths);
  }

  const vapiPaths = [
    path.resolve(__dirname, "templates/voice-agent-vapi.html"),
    path.resolve(process.cwd(), "server/templates/voice-agent-vapi.html"),
    path.resolve(process.cwd(), "templates/voice-agent-vapi.html"),
  ];
  
  for (const p of vapiPaths) {
    try {
      voiceAgentVapiHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded voice-agent-vapi.html from: ${p}`);
      break;
    } catch {}
  }
  
  if (!voiceAgentVapiHtmlContent) {
    console.warn("Warning: Could not load voice-agent-vapi.html. Paths tried:", vapiPaths);
  }

  // Load new voice-booking.html (Vapi official approach)
  const voiceBookingPaths = [
    path.resolve(__dirname, "templates/voice-booking.html"),
    path.resolve(process.cwd(), "server/templates/voice-booking.html"),
    path.resolve(process.cwd(), "templates/voice-booking.html"),
  ];
  
  for (const p of voiceBookingPaths) {
    try {
      voiceBookingHtmlContent = fs.readFileSync(p, "utf-8");
      console.log(`Loaded voice-booking.html from: ${p}`);
      break;
    } catch {}
  }
  
  if (!voiceBookingHtmlContent) {
    console.warn("Warning: Could not load voice-booking.html. Paths tried:", voiceBookingPaths);
  }
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
  await loadVoiceAgentHtml();

  // === WORKFLOWS API ===
  
  app.post("/api/test-email", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    try {
      const success = await sendBookingConfirmation({
        customerName: "Test User",
        customerEmail: email,
        serviceName: "Test Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00 AM",
        price: 5000,
        confirmationNumber: "TEST-123",
        businessName: "BookFlow Test",
      });
      
      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test email. Check server logs." });
      }
    } catch (error) {
      console.error("Error in test-email route:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // === GOOGLE CALENDAR OAUTH ===

  // Get Google Calendar OAuth URL for a business
  app.get("/api/businesses/:businessId/google-calendar/auth-url", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const ownerToken = req.headers['x-owner-token'] as string;
      
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ 
          error: "Google Calendar integration not configured",
          message: "Contact support to enable Google Calendar sync"
        });
      }
      
      const authUrl = getGoogleAuthUrl(businessId, ownerToken);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("[GoogleCal] Error generating auth URL:", error);
      res.status(500).json({ error: error.message || "Failed to generate auth URL" });
    }
  });

  // Google Calendar OAuth callback (public - redirected from Google)
  app.get("/api/google-calendar/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error: oauthError } = req.query;
      
      if (oauthError) {
        console.error("[GoogleCal] OAuth error:", oauthError);
        return res.redirect("/?calendar_error=denied");
      }
      
      if (!code || !state) {
        return res.redirect("/?calendar_error=missing_params");
      }

      const result = await handleGoogleCallback(code as string, state as string);
      
      if (result.success) {
        // Redirect back to settings with success
        res.redirect("/?calendar_connected=true");
      } else {
        res.redirect(`/?calendar_error=${encodeURIComponent(result.error || 'unknown')}`);
      }
    } catch (error: any) {
      console.error("[GoogleCal] Callback error:", error);
      res.redirect(`/?calendar_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Get Google Calendar connection status
  app.get("/api/businesses/:businessId/google-calendar/status", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const status = await hasBusinessCalendar(businessId);
      res.json(status);
    } catch (error: any) {
      console.error("[GoogleCal] Error checking status:", error);
      res.status(500).json({ error: "Failed to check calendar status" });
    }
  });

  // Disconnect Google Calendar
  app.delete("/api/businesses/:businessId/google-calendar", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const success = await disconnectGoogleCalendar(businessId);
      
      if (success) {
        res.json({ success: true, message: "Google Calendar disconnected" });
      } else {
        res.status(500).json({ error: "Failed to disconnect calendar" });
      }
    } catch (error: any) {
      console.error("[GoogleCal] Error disconnecting:", error);
      res.status(500).json({ error: "Failed to disconnect calendar" });
    }
  });

  // Training Data Routes
  app.get("/api/businesses/:businessId/training", async (req, res) => {
    try {
      const data = await storage.getTrainingData(req.params.businessId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training data" });
    }
  });

  app.post("/api/businesses/:businessId/training/qa", async (req, res) => {
    try {
      const { question, answer } = req.body;
      const data = await storage.createTrainingData({
        businessId: req.params.businessId,
        type: "qa_pair",
        question,
        answer,
        status: "active"
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to create Q&A pair" });
    }
  });

  app.post("/api/businesses/:businessId/training/text", async (req, res) => {
    try {
      const { content } = req.body;
      const data = await storage.createTrainingData({
        businessId: req.params.businessId,
        type: "document",
        content,
        title: "Manual Text Input",
        status: "active"
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to add text content" });
    }
  });

  app.post("/api/businesses/:businessId/training/crawl", async (req, res) => {
    try {
      const { url } = req.body;
      // Mock crawl for now, in production this would use a crawler
      const data = await storage.createTrainingData({
        businessId: req.params.businessId,
        type: "website_crawl",
        title: "Home Page",
        sourceUrl: url,
        content: `Content from ${url}`,
        status: "active"
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to crawl website" });
    }
  });

  app.delete("/api/training/:id", async (req, res) => {
    try {
      await storage.deleteTrainingData(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training data" });
    }
  });
  
  // Get voice subscription status by business slug (public)
  app.get("/api/public/businesses/:slug/voice-status", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const business = await storage.getBusinessBySlug(slug);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      // FORCED DEVELOPMENT/EXPO GO OVERRIDE: Always subscribed
      if (process.env.NODE_ENV === "development" || req.query.test_premium === "true" || (req.headers['user-agent'] && req.headers['user-agent'].includes('ExpoGo'))) {
        return res.json({
          isSubscribed: true,
          tier: "business"
        });
      }

      const subscription = await storage.getOrCreateVoiceSubscription(business.id);
      const hasActiveSubscription = subscription.status === "active" && subscription.tier !== "free";
      const hasFreeTrial = subscription.status === "active" && subscription.tier === "free" && subscription.minutesUsed < subscription.minutesLimit;
      res.json({
        isSubscribed: hasActiveSubscription || hasFreeTrial,
        tier: subscription?.tier || "free"
      });
    } catch (error) {
      console.error("Error getting public voice status:", error);
      res.status(500).json({ error: "Failed to get voice status" });
    }
  });

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
      
      // Create default availability for new business (Mon-Fri 9am-5pm, Sat 10am-2pm)
      try {
        for (let day = 1; day <= 5; day++) {
          await storage.setAvailability({
            businessId: business.id,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          });
        }
        // Saturday with reduced hours
        await storage.setAvailability({
          businessId: business.id,
          dayOfWeek: 6,
          startTime: "10:00",
          endTime: "14:00",
          isActive: true,
        });
        // Sunday closed
        await storage.setAvailability({
          businessId: business.id,
          dayOfWeek: 0,
          startTime: "09:00",
          endTime: "17:00",
          isActive: false,
        });
        console.log(`[Business] Created default availability for ${business.name}`);
      } catch (availError) {
        console.error("Error creating default availability:", availError);
        // Don't fail the business creation if availability setup fails
      }
      
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
      // Allow partial updates with broad validation
      const updates = req.body;
      
      // Basic check for name length if provided, but don't strictly block long names
      if (updates.name && typeof updates.name === 'string' && updates.name.length > 500) {
        return res.status(400).json({ error: "Business name is too long (max 500 characters)" });
      }

      const business = await storage.updateBusiness(req.params.id, updates);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      const bookingUrl = getBookingUrlForBusiness(business, req);
      res.json({ ...business, bookingUrl });
    } catch (error: any) {
      console.error("Error updating business:", error);
      res.status(500).json({ error: "Failed to update business", details: error.message });
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
      
      // Get business, service, and customer for notifications/workflows
      const business = await storage.getBusiness(req.params.businessId);
      const service = await storage.getService(data.serviceId);
      const customer = data.customerId ? await storage.getCustomer(data.customerId) : null;
      const serviceName = service?.name || "Service";
      const customerName = req.body.customerName || customer?.name || "Customer";
      
      // Note: Email confirmation is handled by workflow engine via triggerWorkflows("booking_created")
      // This prevents duplicate emails that were occurring when both routes.ts AND workflowEngine.ts sent emails
      
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
      
      // Trigger workflow automations for booking_created
      console.log(`[Booking] Triggering workflows for booking ${booking.id} (${customerName})`);
      
      // Ensure we have correct industry for blueprints
      const industry = (business as any).industry || "salon";
      const workflows = await storage.getWorkflowsByTrigger(req.params.businessId, "booking_created");
      if (workflows.length === 0) {
        console.log(`[Booking] No workflows found for business ${req.params.businessId}, initializing ${industry} blueprints`);
        await initializeIndustryBlueprints(req.params.businessId, industry);
      }

      triggerWorkflows("booking_created", req.params.businessId, {
        booking,
        service: service || undefined,
        customer: customer || undefined,
      }).catch(err => console.error("[Workflow] Error triggering booking_created:", err));
      
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

      // Trigger workflows on status change
      if (updates.status) {
        const triggerType = `booking_${updates.status}`;
        const service = await storage.getService(booking.serviceId);
        const customer = await storage.getCustomer(booking.customerId);
        
        triggerWorkflows(triggerType, booking.businessId, {
          booking,
          service: service || undefined,
          customer: customer || undefined,
        }).catch(err => console.error(`[Workflow] Error triggering ${triggerType}:`, err));
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
      
      // Get blocked slots for this date
      const blockedSlots = await storage.getBlockedSlotsByDate(businessId, date);
      const blockedTimes = blockedSlots.map(b => b.time);
      
      // Generate time slots
      const slots = [];
      const [startHour] = dayAvailability.startTime.split(":").map(Number);
      const [endHour] = dayAvailability.endTime.split(":").map(Number);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
        const time30 = `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? "PM" : "AM"}`;
        
        slots.push({
          time,
          available: !bookedTimes.includes(time) && !blockedTimes.includes(time),
          isBlocked: blockedTimes.includes(time),
        });
        slots.push({
          time: time30,
          available: !bookedTimes.includes(time30) && !blockedTimes.includes(time30),
          isBlocked: blockedTimes.includes(time30),
        });
      }
      
      res.json({ slots });
    } catch (error) {
      console.error("Error getting slots:", error);
      res.status(500).json({ error: "Failed to get slots" });
    }
  });

  // === BLOCKED SLOTS ===
  
  // Get blocked slots for a business (PROTECTED)
  app.get("/api/businesses/:businessId/blocked-slots", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const blockedSlots = await storage.getBlockedSlots(req.params.businessId);
      res.json(blockedSlots);
    } catch (error) {
      console.error("Error getting blocked slots:", error);
      res.status(500).json({ error: "Failed to get blocked slots" });
    }
  });

  // Get blocked slots for a specific date (PROTECTED)
  app.get("/api/businesses/:businessId/blocked-slots/:date", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const blockedSlots = await storage.getBlockedSlotsByDate(req.params.businessId, req.params.date);
      res.json(blockedSlots);
    } catch (error) {
      console.error("Error getting blocked slots:", error);
      res.status(500).json({ error: "Failed to get blocked slots" });
    }
  });

  // Block a time slot (PROTECTED)
  app.post("/api/businesses/:businessId/blocked-slots", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, time, reason } = req.body;
      
      if (!date || !time) {
        return res.status(400).json({ error: "Date and time are required" });
      }
      
      const blockedSlot = await storage.createBlockedSlot({
        businessId: req.params.businessId,
        date,
        time,
        reason: reason || null,
      });
      
      res.status(201).json(blockedSlot);
    } catch (error) {
      console.error("Error blocking slot:", error);
      res.status(500).json({ error: "Failed to block slot" });
    }
  });

  // Unblock a time slot by ID (PROTECTED)
  app.delete("/api/businesses/:businessId/blocked-slots/:slotId", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteBlockedSlot(req.params.slotId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unblocking slot:", error);
      res.status(500).json({ error: "Failed to unblock slot" });
    }
  });

  // Unblock a time slot by date and time (PROTECTED)
  app.delete("/api/businesses/:businessId/blocked-slots/:date/:time", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, time } = req.params;
      await storage.deleteBlockedSlotByDateTime(req.params.businessId, date, decodeURIComponent(time));
      res.status(204).send();
    } catch (error) {
      console.error("Error unblocking slot:", error);
      res.status(500).json({ error: "Failed to unblock slot" });
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

  // Clear all data for a business (PROTECTED)
  app.delete("/api/businesses/:businessId/data", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.clearAllData(req.params.businessId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing all data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Extract theme colors from a website
  app.post("/api/businesses/:businessId/theme/extract", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        primaryColor: "#000000",
        accentColor: "#C5A059",
        backgroundColor: "#FFFFFF",
        textColor: "#1A1C1E",
        borderRadius: 12,
        fontFamily: "Inter",
        buttonStyle: "rounded",
        showPoweredBy: true
      });
    } catch (error) {
      console.error("Error extracting theme:", error);
      res.status(500).json({ error: "Failed to extract theme" });
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

  // Send test email (for debugging Resend integration)
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      console.log(`[Test Email] Attempting to send test email to ${email}`);
      
      const success = await sendBookingConfirmation({
        customerName: "Test User",
        customerEmail: email,
        serviceName: "Test Service",
        date: new Date().toISOString().split('T')[0],
        time: "2:00 PM",
        price: 50,
        confirmationNumber: "TEST1234",
        businessName: "BookFlow Test"
      });
      
      if (success) {
        res.json({ success: true, message: `Test email sent to ${email}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test email. Check server logs." });
      }
    } catch (error) {
      console.error("[Test Email] Error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // === AI SERVICE ASSISTANT ===
  
  // Generate services from natural language description
  app.post("/api/ai/generate-services", async (req: Request, res: Response) => {
    try {
      const { description, businessType, currency } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: "Description is required" });
      }
      
      const { generateServicesFromDescription } = await import("./ai");
      const result = await generateServicesFromDescription(description, businessType, currency);
      
      // Return both services and addons
      res.json({ 
        services: result.services, 
        addons: result.addons 
      });
    } catch (error) {
      console.error("[AI] Error generating services:", error);
      res.status(500).json({ error: "Failed to generate services. Please try again." });
    }
  });

  // Get customer insights (AI-powered analytics)
  app.get("/api/businesses/:businessId/insights", async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      
      // Get all customers, bookings, and services for this business
      const [allCustomers, allBookings, allServices] = await Promise.all([
        storage.getCustomers(businessId),
        storage.getBookings(businessId),
        storage.getServices(businessId),
      ]);
      
      // Transform bookings to match expected format
      const bookingsForAnalysis = allBookings.map(b => ({
        customerId: b.customerId,
        serviceId: b.serviceId,
        date: b.date,
        totalPrice: b.totalPrice,
        status: b.status,
      }));
      
      const { analyzeCustomerInsights } = await import("./ai");
      const insights = analyzeCustomerInsights(allCustomers, bookingsForAnalysis, allServices);
      
      res.json(insights);
    } catch (error) {
      console.error("[Insights] Error:", error);
      res.status(500).json({ error: "Failed to analyze customer insights" });
    }
  });

  // Get AI-powered upsell suggestions for a service
  app.post("/api/ai/upsell-suggestions", async (req: Request, res: Response) => {
    try {
      const { serviceName, serviceDescription, servicePrice, businessType, currency } = req.body;
      
      if (!serviceName) {
        return res.status(400).json({ error: "Service name is required" });
      }
      
      const { generateUpsellSuggestions } = await import("./ai");
      const suggestions = await generateUpsellSuggestions(
        serviceName,
        serviceDescription || "",
        servicePrice || 0,
        businessType,
        currency
      );
      
      res.json({ suggestions });
    } catch (error) {
      console.error("[AI Upsell] Error:", error);
      res.status(500).json({ error: "Failed to generate suggestions", suggestions: [] });
    }
  });

  // === QR CODE API ===
  
  // Generate QR code for booking link
  // QR Code generator endpoint
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
        // Return as PNG image file for direct download/sharing with branding
        const qrSize = 1024;
        const padding = 80;
        const cornerRadius = 48;
        const totalSize = qrSize + padding * 2;
        
        // Generate raw QR code
        const qrCodeBuffer = await new Promise<Buffer>((resolve, reject) => {
          QRCode.toBuffer(bookingUrl, {
            errorCorrectionLevel: 'H',
            width: qrSize,
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
        
        // Create business name text overlay SVG
        const businessName = (business.name || 'BOOK').toUpperCase();
        const fontSize = Math.min(48, Math.max(24, Math.floor(200 / Math.max(businessName.length, 1))));
        const textWidth = Math.min(businessName.length * fontSize * 0.6, qrSize * 0.6);
        const textHeight = fontSize + 16;
        const textX = totalSize / 2;
        const textY = totalSize / 2;
        
        const textOverlaySvg = `
          <svg width="${totalSize}" height="${totalSize}">
            <rect x="${textX - textWidth/2 - 12}" y="${textY - textHeight/2}" 
                  width="${textWidth + 24}" height="${textHeight}" 
                  rx="8" ry="8" fill="white" stroke="black" stroke-width="4"/>
            <text x="${textX}" y="${textY + fontSize/3}" 
                  font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" 
                  fill="black" text-anchor="middle">${businessName}</text>
          </svg>
        `;
        
        // Create rounded corners mask
        const roundedMask = Buffer.from(`
          <svg width="${totalSize}" height="${totalSize}">
            <rect x="0" y="0" width="${totalSize}" height="${totalSize}" 
                  rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
          </svg>
        `);
        
        // Compose final image with Sharp
        const sharp = (await import('sharp')).default;
        
        const brandedQr = await sharp({
          create: {
            width: totalSize,
            height: totalSize,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .composite([
          { input: await sharp(qrCodeBuffer).resize(qrSize, qrSize).toBuffer(), left: padding, top: padding },
          { input: Buffer.from(textOverlaySvg), left: 0, top: 0 }
        ])
        .png()
        .toBuffer();
        
        // Apply rounded corners
        const finalImage = await sharp(brandedQr)
          .composite([{ input: roundedMask, blend: 'dest-in' }])
          .png()
          .toBuffer();
        
        res.type('image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${business.slug}-booking-qr.png"`);
        res.send(finalImage);
      } else {
        // Return as JSON with base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
          errorCorrectionLevel: 'H',
          width: 600,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        res.json({ 
          qrCode: qrCodeDataUrl,
          bookingUrl,
          businessSlug: business.slug,
          businessName: business.name,
          qrImageUrl: `/api/businesses/${business.id}/qrcode?format=image`
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // === PUBLIC BOOKING PAGE ===
  
  // Helper to get industry-specific phrase
  function getHeroPhrase(businessName: string, serviceName?: string): string {
    const name = businessName.toLowerCase();
    const service = (serviceName || "").toLowerCase();
    const combined = `${name} ${service}`;
    
    if (combined.includes('dentist') || combined.includes('dental') || combined.includes('teeth') || combined.includes('orthodontist')) {
      return "RESTORE YOUR SMILE";
    }
    if (combined.includes('consultant') || combined.includes('consulting') || combined.includes('coach') || combined.includes('advisor') || combined.includes('expert')) {
      return "BOOK YOUR SESSION";
    }
    if (combined.includes('salon') || combined.includes('hair') || combined.includes('barber') || combined.includes('cut') || combined.includes('style') || combined.includes('beauty')) {
      return "ELEVATE YOUR STYLE";
    }
    if (combined.includes('spa') || combined.includes('massage') || combined.includes('therapy') || combined.includes('relax')) {
      return "FIND YOUR CALM";
    }
    if (combined.includes('car wash') || combined.includes('auto') || combined.includes('detail') || combined.includes('shine')) {
      return "SHINE YOUR RIDE";
    }
    if (combined.includes('contractor') || combined.includes('plumb') || combined.includes('electr') || combined.includes('repair') || combined.includes('fix')) {
      return "BOOK YOUR SERVICE";
    }
    
    return "RESERVE YOUR SPACE";
  }

  // Generate premium cinematic OG image for link previews (inspired by luxury brand aesthetics)
  function generateCinematicOgImage(businessName: string, serviceName?: string, tagline?: string): string {
    const heroPhrase = getHeroPhrase(businessName, serviceName);
    const phrases = heroPhrase.split(' ');
    
    // Premium stacked title layout with dynamic wrapping
    const titleLines: string[] = [];
    if (serviceName) {
      const upperService = serviceName.toUpperCase();
      if (upperService.length > 16) {
        // Split long service names into multiple lines
        const words = upperService.split(' ');
        let currentLine = "";
        words.forEach(word => {
          if ((currentLine + word).length > 16) {
            if (currentLine) titleLines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine += word + " ";
          }
        });
        if (currentLine) titleLines.push(currentLine.trim());
      } else {
        titleLines.push(upperService);
      }
    } else {
      titleLines.push(...phrases);
    }

    // Limit to 3 lines for visual balance
    const finalLines = titleLines.slice(0, 3);
    const fontSize = finalLines.length > 2 ? 80 : 120;
    const startY = 300 - (finalLines.length * fontSize * 0.4);
    
    const textElements = finalLines.map((line, i) => {
      const y = startY + (i * fontSize * 1.1);
      return `<text x="100" y="${y}" font-size="${fontSize}" font-weight="200" fill="rgba(255,255,255,0.95)" font-family="system-ui, -apple-system, 'Helvetica Neue', sans-serif" letter-spacing="8">${line}</text>`;
    }).join('\n');

    // Create premium SVG with smoke effects and elegant typography
    return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Subtle radial gradient for depth -->
        <radialGradient id="smokeBg" cx="50%" cy="30%" r="80%" fx="50%" fy="30%">
          <stop offset="0%" style="stop-color:#1a1a1a"/>
          <stop offset="60%" style="stop-color:#0a0a0a"/>
          <stop offset="100%" style="stop-color:#000000"/>
        </radialGradient>
        
        <!-- Smoke/mist effect filter -->
        <filter id="smokeFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
          <feGaussianBlur stdDeviation="8"/>
        </filter>
        
        <!-- Glow for smoke wisps -->
        <filter id="smokeGlow">
          <feGaussianBlur stdDeviation="20" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      
      <!-- Pure black background -->
      <rect width="1200" height="630" fill="#000000"/>
      
      <!-- Subtle gradient overlay -->
      <rect width="1200" height="630" fill="url(#smokeBg)" opacity="0.8"/>
      
      <!-- Smoke wisps - ethereal atmosphere -->
      <ellipse cx="150" cy="500" rx="300" ry="150" fill="rgba(40,40,45,0.4)" filter="url(#smokeGlow)"/>
      <ellipse cx="1050" cy="550" rx="250" ry="120" fill="rgba(35,35,40,0.3)" filter="url(#smokeGlow)"/>
      <ellipse cx="600" cy="580" rx="400" ry="100" fill="rgba(30,30,35,0.25)" filter="url(#smokeGlow)"/>
      
      <!-- Top left diagonal accent lines (subtle) -->
      <line x1="0" y1="0" x2="200" y2="200" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="50" y1="0" x2="250" y2="200" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      
      <!-- Main stacked title - elegant typography, left-aligned -->
      ${textElements}
      
      <!-- Elegant horizontal accent line -->
      <rect x="100" y="${startY + (finalLines.length * fontSize * 1.1) + 20}" width="80" height="2" fill="rgba(255,255,255,0.5)"/>
      
      <!-- Bottom info bar with glass effect -->
      <rect x="0" y="470" width="1200" height="160" fill="rgba(18,18,18,0.95)"/>
      <line x1="0" y1="470" x2="1200" y2="470" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      
      <!-- Business name - large and prominent -->
      <text x="100" y="535" font-size="56" font-weight="500" fill="rgba(255,255,255,0.95)" font-family="system-ui, -apple-system, 'Helvetica Neue', sans-serif" letter-spacing="1">
        ${businessName}
      </text>
      
      <!-- Subtitle - larger and more visible -->
      <text x="100" y="585" font-size="26" font-weight="400" fill="rgba(255,255,255,0.6)" font-family="system-ui, -apple-system, 'Helvetica Neue', sans-serif" letter-spacing="5">
        BOOK YOUR APPOINTMENT
      </text>
      
      <!-- Domain - more visible -->
      <text x="100" y="620" font-size="18" font-weight="400" fill="rgba(255,255,255,0.4)" font-family="system-ui, -apple-system, 'Helvetica Neue', sans-serif" letter-spacing="3">
        CONFIRMBOOKING.ONLINE
      </text>
      
      <!-- Arrow button - right side, larger -->
      <g transform="translate(1040, 520)">
        <circle cx="35" cy="35" r="35" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <path d="M25 25 L45 45 M45 45 L45 33 M45 45 L33 45" stroke="rgba(255,255,255,0.7)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }
  
  // Serve dynamic OG image for businesses (SVG format for better compatibility)
  app.get("/og/:slug.svg", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      const businessName = business?.name || 'BookFlow';
      const svg = generateCinematicOgImage(businessName);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch {
      const svg = generateCinematicOgImage('BookFlow');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  });

  // Serve actual PNG images converted from SVG for better social media compatibility
  app.get("/og/:slug.png", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      const businessName = business?.name || 'BookFlow';
      const svg = generateCinematicOgImage(businessName);
      
      // Convert SVG to PNG using sharp for WhatsApp/social media compatibility
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
    } catch (error) {
      console.error('Error generating OG image:', error);
      // Fallback to SVG if PNG conversion fails
      const svg = generateCinematicOgImage('BookFlow');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  });
  
  // Serve dynamic OG image for specific service
  app.get("/og/:slug/:serviceSlug.svg", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        const svg = generateCinematicOgImage('BookFlow');
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }
      
      const services = await storage.getServices(business.id);
      const service = services.find(s => s.slug === req.params.serviceSlug || s.id === req.params.serviceSlug);
      const serviceName = service?.name;
      
      const svg = generateCinematicOgImage(business.name, serviceName);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch {
      const svg = generateCinematicOgImage('BookFlow');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  });

  // Serve PNG for service OG images with proper conversion
  app.get("/og/:slug/:serviceSlug.png", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        const svg = generateCinematicOgImage('BookFlow');
        const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
        res.setHeader('Content-Type', 'image/png');
        return res.send(pngBuffer);
      }
      
      const services = await storage.getServices(business.id);
      const service = services.find(s => s.slug === req.params.serviceSlug || s.id === req.params.serviceSlug);
      const serviceName = service?.name;
      
      const svg = generateCinematicOgImage(business.name, serviceName);
      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
    } catch (error) {
      console.error('Error generating service OG image:', error);
      const svg = generateCinematicOgImage('BookFlow');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  });
  
  // Fallback OG image
  app.get("/og-image.svg", (req: Request, res: Response) => {
    const svg = generateCinematicOgImage('BookFlow', undefined, 'Professional Booking Platform');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  app.get("/og-image.png", async (req: Request, res: Response) => {
    try {
      const svg = generateCinematicOgImage('BookFlow', undefined, 'Professional Booking Platform');
      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
    } catch {
      const svg = generateCinematicOgImage('BookFlow', undefined, 'Professional Booking Platform');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  });
  
  // Helper function to generate Open Graph meta tags (Apple-style clean format)
  function generateOpenGraphMeta(business: any, service?: any, req?: Request, allServices?: any[]): string {
    // Always use HTTPS for production OG images (required for proper link previews)
    const baseUrl = 'https://confirmbooking.online';
    
    // Apple-style clean title - simple and elegant
    let title = `Book with ${business.name}`;
    let description = 'Book your appointment';

    if (service) {
      title = `${service.name} - ${business.name}`;
      description = 'Book your appointment';
    } else if (allServices && allServices.length > 0) {
      const serviceNames = allServices.slice(0, 4).map(s => s.name).join(', ');
      title = `${business.name} | Professional Services`;
      description = `Services: ${serviceNames}${allServices.length > 4 ? '...' : ''}`;
    }
    
    // Use dynamic cinematic OG image based on business/service
    const ogImage = service 
      ? `${baseUrl}/og/${business.slug}/${service.slug || service.id}.png`
      : `${baseUrl}/og/${business.slug}.png`;
    
    const ogUrl = service 
      ? `${baseUrl}/book/${business.slug}/${service.slug || service.id}`
      : `${baseUrl}/book/${business.slug}`;
    
    // Apple-style meta tags with secure_url for maximum compatibility
    return `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:site_name" content="BookFlow" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="${business.name}" />
    <meta name="theme-color" content="#000000" />`;
  }
  
  // Serve public booking page (client-side routing)
  app.get("/book/:slug", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        console.error(`[Booking] Business not found for slug: ${req.params.slug}`);
        return res.status(404).json({ error: "Business not found" });
      }

      // Monetization Gate: Check if business is premium or has active voice subscription
      if (!business.isPremium) {
        const voiceSub = await storage.getVoiceSubscription(business.id);
        const hasActiveVoiceSub = !!voiceSub && voiceSub.status === "active" && voiceSub.tier !== "free";

        if (!hasActiveVoiceSub) {
          const trialExpiry = business.premiumExpiresAt ? new Date(business.premiumExpiresAt) : null;
          const now = new Date();
          const createdAt = business.createdAt ? new Date(business.createdAt) : now;
          
          // FORCED DEVELOPMENT OVERRIDE: Always active in dev
          if (process.env.NODE_ENV === 'development') {
            // Skip expiration check
          } else {
            const trialDays = 7;
            const trialPeriodMs = trialDays * 24 * 60 * 60 * 1000;
            const isWithinTrial = (now.getTime() - createdAt.getTime()) < trialPeriodMs;

            if (!isWithinTrial && (!trialExpiry || trialExpiry < now)) {
              if (expiredHtmlContent) {
                return res.type("text/html").send(expiredHtmlContent.replace(/{{businessName}}/g, business.name));
              }
              return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Booking Link Expired | BookFlow</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff; text-align: center; padding: 20px; }
                    .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); padding: 48px 32px; border-radius: 32px; max-width: 400px; width: 100%; }
                    h1 { font-size: 24px; margin-bottom: 16px; font-weight: 700; }
                    p { color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 0; font-size: 16px; }
                    .logo { font-weight: 800; font-size: 28px; margin-bottom: 40px; display: block; letter-spacing: -0.5px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <span class="logo">BookFlow</span>
                    <h1>Booking link expired</h1>
                    <p>The booking link for <strong>${business.name}</strong> has expired. Please contact the business owner directly to book your appointment.</p>
                  </div>
                </body>
                </html>
              `);
            }
          }
        }
      }
      
      const services = await storage.getServices(business.id);
      
      // Check for specific service highlight via query param (supports both 'serviceId' and legacy 'service')
      const targetServiceId = (req.query.serviceId || req.query.service) as string;
      let highlightedService = services && services.length > 0 ? services[0] : undefined;
      
      if (targetServiceId) {
        const found = services.find(s => s.id === targetServiceId);
        if (found) highlightedService = found;
      }

      // If no specific service is requested via query, and user wants "all services", 
      // we pass null to service to trigger the "all services" description logic
      const ogMeta = generateOpenGraphMeta(
        business, 
        targetServiceId ? highlightedService : undefined, 
        req, 
        services
      );
      
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
  
  // Handle service-specific booking URLs: /book/:businessSlug/:serviceSlug
  app.get("/book/:slug/:serviceSlug", async (req: Request, res: Response) => {
    try {
      if (!bookingHtmlContent) {
        return res.status(500).json({ error: "Booking page not available" });
      }
      
      const business = await storage.getBusinessBySlug(req.params.slug);
      if (!business) {
        console.error(`[Booking] Business not found for slug: ${req.params.slug}`);
        return res.status(404).json({ error: "Business not found" });
      }

      // Monetization Gate: Check if business is premium or has active voice subscription
      if (!business.isPremium) {
        const voiceSub = await storage.getVoiceSubscription(business.id);
        const hasActiveVoiceSub = !!voiceSub && voiceSub.status === "active" && voiceSub.tier !== "free";

        if (!hasActiveVoiceSub) {
          const trialExpiry = business.premiumExpiresAt ? new Date(business.premiumExpiresAt) : null;
          const now = new Date();
          const createdAt = business.createdAt ? new Date(business.createdAt) : now;
          const trialDays = process.env.NODE_ENV === 'development' ? 30 : 7;
          const trialPeriodMs = trialDays * 24 * 60 * 60 * 1000;
          const isWithinTrial = (now.getTime() - createdAt.getTime()) < trialPeriodMs;

          if (!isWithinTrial && (!trialExpiry || trialExpiry < now)) {
            return res.status(402).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Booking Locked | BookFlow</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff; text-align: center; padding: 20px; }
                .card { background: #111; padding: 40px; border-radius: 24px; border: 1px solid #222; max-width: 400px; }
                h1 { font-size: 24px; margin-bottom: 16px; font-weight: 800; letter-spacing: -0.02em; }
                p { color: #888; line-height: 1.5; margin-bottom: 24px; font-size: 16px; }
                .logo { font-weight: 800; font-size: 32px; margin-bottom: 40px; display: block; letter-spacing: -0.05em; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="logo">BookFlow</span>
                <h1>Booking link expired</h1>
                <p>The booking link for <strong>${business.name}</strong> has expired. Please contact the business owner directly to book your appointment.</p>
              </div>
            </body>
            </html>
          `);
          }
        }
      }
      
      const services = await storage.getServices(business.id);
      
      // Find service by slug
      const service = await storage.getServiceBySlug(business.id, req.params.serviceSlug);
      
      // If service slug is actually an ID, fallback to finding by ID
      let highlightedService = service;
      if (!highlightedService && req.params.serviceSlug) {
        const allServices = await storage.getServices(business.id);
        highlightedService = allServices.find(s => s.id === req.params.serviceSlug);
      }
      
      // Fallback to first service only if none found at all
      if (!highlightedService) {
        highlightedService = services && services.length > 0 ? services[0] : undefined;
      }
      
      const ogMeta = generateOpenGraphMeta(business, highlightedService, req, services);
      
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
        console.error(`[Booking] Business not found for slug: ${req.params.slug}`);
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

  // === CONTEXT4ALL SMART SUGGESTIONS API ===

  // Get smart upsell suggestion for a booking context
  app.post("/api/smart-suggestions/upsell", async (req: Request, res: Response) => {
    try {
      const { businessId, serviceId, customerType, bookingChannel, mobileService } = req.body;

      if (!businessId || !serviceId) {
        return res.status(400).json({ error: "businessId and serviceId are required" });
      }

      const business = await storage.getBusiness(businessId);
      const service = await storage.getService(serviceId);

      if (!business || !service) {
        return res.status(404).json({ error: "Business or service not found" });
      }

      const allServices = await storage.getServices(businessId);
      const availableAddons = allServices
        .filter(s => s.id !== serviceId && s.price < service.price)
        .map(s => ({ name: s.name, price: s.price, duration: s.duration }));

      const context = buildBookingContext(
        { name: business.name, industry: (business as any).industry },
        { name: service.name, price: service.price, duration: service.duration },
        {
          customerType: customerType || "new",
          bookingChannel: bookingChannel || "link",
          mobileService: mobileService || false,
          availableAddons,
        }
      );

      const suggestion = await getSmartUpsellSuggestion(context);

      res.json({
        suggestion,
        context: {
          industry: context.industry,
          timeOfDay: context.timeOfDay,
          dayOfWeek: context.dayOfWeek,
        },
      });
    } catch (error) {
      console.error("[Context4All] Error getting upsell suggestion:", error);
      res.status(500).json({ error: "Failed to get smart suggestion" });
    }
  });

  // Get dynamic messaging for a business/service context
  app.post("/api/smart-suggestions/messaging", async (req: Request, res: Response) => {
    try {
      const { businessId, serviceId, customerType } = req.body;

      if (!businessId || !serviceId) {
        return res.status(400).json({ error: "businessId and serviceId are required" });
      }

      const business = await storage.getBusiness(businessId);
      const service = await storage.getService(serviceId);

      if (!business || !service) {
        return res.status(404).json({ error: "Business or service not found" });
      }

      const context = buildBookingContext(
        { name: business.name, industry: (business as any).industry },
        { name: service.name, price: service.price, duration: service.duration },
        { customerType: customerType || "new" }
      );

      const messaging = await getDynamicMessage(context);

      res.json({
        messaging,
        industry: context.industry,
      });
    } catch (error) {
      console.error("[Context4All] Error getting dynamic messaging:", error);
      res.status(500).json({ error: "Failed to get dynamic messaging" });
    }
  });

  // Get revenue insight explanation
  app.post("/api/smart-suggestions/revenue-insight", async (req: Request, res: Response) => {
    try {
      const { businessId, serviceId, percentageIncrease } = req.body;

      if (!businessId || !serviceId) {
        return res.status(400).json({ error: "businessId and serviceId are required" });
      }

      const business = await storage.getBusiness(businessId);
      const service = await storage.getService(serviceId);

      if (!business || !service) {
        return res.status(404).json({ error: "Business or service not found" });
      }

      const context = buildBookingContext(
        { name: business.name, industry: (business as any).industry },
        { name: service.name, price: service.price, duration: service.duration }
      );

      const explanation = getRevenueInsightExplanation(percentageIncrease || 15, context);

      res.json({
        explanation,
        percentageIncrease: percentageIncrease || 15,
        industry: context.industry,
      });
    } catch (error) {
      console.error("[Context4All] Error getting revenue insight:", error);
      res.status(500).json({ error: "Failed to get revenue insight" });
    }
  });

  // === VOICE SUBSCRIPTION API ===

  // Get voice subscription and usage for a business
  app.get("/api/businesses/:businessId/voice-subscription", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;

      // Mock premium for testing in Expo Go / Development
      if (process.env.NODE_ENV === "development" || req.query.test_premium === "true" || (req.headers['user-agent'] && req.headers['user-agent'].includes('ExpoGo'))) {
        return res.json({
          subscription: {
            tier: 'business',
            status: 'active',
            minutesLimit: 500,
            minutesUsed: 0,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            stripeSubscriptionId: 'mock_stripe_id',
          },
          usage: {
            available: true,
            remaining: 500,
            percentUsed: 0,
            limit: 500,
            used: 0
          },
          stats: {
            totalCalls: 0,
            bookingsCreated: 0,
            conversionRate: 0,
          },
        });
      }

      const subscription = await storage.getOrCreateVoiceSubscription(businessId);
      const usage = await storage.checkVoiceMinutesAvailable(businessId);
      const stats = await storage.getVoiceUsageStats(businessId);
      
      res.json({
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          minutesLimit: subscription.minutesLimit,
          minutesUsed: subscription.minutesUsed,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        },
        usage: {
          available: usage.available,
          remaining: usage.remaining,
          percentUsed: Math.round((usage.used / usage.limit) * 100),
          limit: usage.limit,
          used: usage.used
        },
        stats: {
          totalCalls: stats.totalCalls,
          bookingsCreated: stats.bookingsCreated,
          conversionRate: stats.totalCalls > 0 
            ? Math.round((stats.bookingsCreated / stats.totalCalls) * 100) 
            : 0,
        },
      });
    } catch (error) {
      console.error("[Voice Subscription] Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch voice subscription" });
    }
  });

  // Sync voice subscription tier from RevenueCat purchase
  app.post("/api/businesses/:businessId/voice-subscription/sync", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { tier } = req.body;

      const validTiers = ["free", "starter", "pro", "business"];
      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      const minutesMap: Record<string, number> = {
        free: 5,
        starter: 60,
        pro: 200,
        business: 500,
      };

      const isPaidTier = tier !== "free";

      await storage.updateVoiceSubscription(businessId, {
        tier,
        status: isPaidTier ? "active" : "trialing",
        minutesLimit: minutesMap[tier] || 5,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      if (isPaidTier) {
        await storage.updateBusiness(businessId, { isPremium: true });
      }

      console.log(`[Voice Sync] Synced ${tier} subscription for ${businessId}${isPaidTier ? ", granted premium access" : ""}`);
      res.json({ success: true, tier, isPremium: isPaidTier });
    } catch (error) {
      console.error("[Voice Sync] Error syncing subscription:", error);
      res.status(500).json({ error: "Failed to sync voice subscription" });
    }
  });

  // Get voice call logs for a business
  app.get("/api/businesses/:businessId/voice-calls", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const calls = await storage.getVoiceCallLogs(businessId, limit);
      
      res.json({ calls });
    } catch (error) {
      console.error("[Voice Subscription] Error fetching call logs:", error);
      res.status(500).json({ error: "Failed to fetch voice call logs" });
    }
  });

  // Get available subscription tiers (public)
  app.get("/api/voice-tiers", async (req: Request, res: Response) => {
    const tiers = [
      {
        id: "free",
        name: "Free Trial",
        price: 0,
        minutes: 5,
        features: ["5 minutes free", "Basic voice booking", "Email confirmations"],
      },
      {
        id: "starter",
        name: "Starter",
        price: 4900, // cents
        priceDisplay: "$49",
        minutes: 60,
        features: ["60 minutes/month", "Voice booking", "Email confirmations", "Basic analytics"],
      },
      {
        id: "pro",
        name: "Pro",
        price: 14900,
        priceDisplay: "$149",
        minutes: 200,
        features: ["200 minutes/month", "Voice booking", "Email confirmations", "Advanced analytics", "Priority support"],
        popular: true,
      },
      {
        id: "business",
        name: "Business",
        price: 34900,
        priceDisplay: "$349",
        minutes: 500,
        features: ["500 minutes/month", "Voice booking", "Email confirmations", "Advanced analytics", "Priority support", "Custom voice", "API access"],
      },
    ];
    
    res.json({ tiers });
  });

  // Create Stripe checkout session for voice subscription
  app.post("/api/voice-checkout", async (req: Request, res: Response) => {
    try {
      const { businessId, tier, ownerToken } = req.body;
      
      // Verify ownership
      const business = await storage.getBusiness(businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Voice tier pricing and details
      const tierConfig: Record<string, { name: string; price: number; minutes: number }> = {
        starter: { name: "Voice Agent Starter", price: 4900, minutes: 60 },
        pro: { name: "Voice Agent Pro", price: 14900, minutes: 200 },
        business: { name: "Voice Agent Business", price: 34900, minutes: 500 },
      };

      const config = tierConfig[tier];
      if (!config) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      // Search for the product in Stripe
      const products = await stripe.products.search({
        query: `metadata['tier']:'${tier}' AND metadata['type']:'voice_subscription'`,
        limit: 1,
      });

      let priceId: string | undefined;
      
      if (products.data.length > 0) {
        // Product exists, get its price
        const prices = await stripe.prices.list({
          product: products.data[0].id,
          active: true,
          limit: 1,
        });
        priceId = prices.data[0]?.id;
      }
      
      // Auto-create product and price if not found
      if (!priceId) {
        console.log(`[Voice Checkout] Creating Stripe product for tier: ${tier}`);
        
        const product = await stripe.products.create({
          name: config.name,
          description: `${config.minutes} minutes/month of AI voice booking`,
          metadata: {
            tier,
            type: "voice_subscription",
            minutes: String(config.minutes),
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: config.price,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { tier },
        });

        priceId = price.id;
        console.log(`[Voice Checkout] Created product ${product.id} with price ${priceId}`);
      }

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/billing/${businessId}?success=true&token=${ownerToken}`,
        cancel_url: `${baseUrl}/billing/${businessId}?canceled=true&token=${ownerToken}`,
        metadata: {
          businessId,
          tier,
        },
        subscription_data: {
          metadata: {
            businessId,
            tier,
          },
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Voice Checkout] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe billing portal session
  app.post("/api/voice-billing-portal", async (req: Request, res: Response) => {
    try {
      const { businessId, ownerToken } = req.body;
      
      const business = await storage.getBusiness(businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const subscription = await storage.getVoiceSubscription(businessId);
      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${baseUrl}/billing/${businessId}?token=${ownerToken}`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Voice Billing Portal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve billing management page
  app.get("/billing/:businessId", async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const token = req.query.token as string;
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).send("Business not found");
      }

      const subscription = await storage.getOrCreateVoiceSubscription(businessId);
      const usage = await storage.checkVoiceMinutesAvailable(businessId);
      const stats = await storage.getVoiceUsageStats(businessId);
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voice Agent Billing - ${business.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.5); font-size: 14px; }
    .card { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); }
    .tier-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; }
    .tier-free { background: #6B7280; }
    .tier-starter { background: #3B82F6; }
    .tier-pro { background: #8B5CF6; }
    .tier-business { background: #F59E0B; }
    .usage-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 16px 0; overflow: hidden; }
    .usage-fill { height: 100%; background: #fff; border-radius: 4px; transition: width 0.3s; }
    .usage-fill.warning { background: #EF4444; }
    .stats-row { display: flex; justify-content: space-between; margin-top: 20px; text-align: center; }
    .stat { flex: 1; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-top: 4px; }
    .tier-grid { display: grid; gap: 12px; margin-top: 24px; }
    .tier-card { padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s; }
    .tier-card:hover { border-color: rgba(255,255,255,0.3); }
    .tier-card.current { border-color: #fff; background: rgba(255,255,255,0.05); }
    .tier-card.popular { border-color: #8B5CF6; }
    .tier-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .tier-price { font-size: 28px; font-weight: 700; }
    .tier-price span { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 400; }
    .tier-minutes { color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 4px; }
    .btn { display: block; width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; text-align: center; text-decoration: none; margin-top: 12px; }
    .btn-primary { background: #fff; color: #000; }
    .btn-secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.2); }
    .btn:hover { opacity: 0.9; }
    .success-banner { background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); color: #22C55E; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
    .popular-badge { background: #8B5CF6; color: #fff; font-size: 9px; padding: 2px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Voice Agent</h1>
      <p>${business.name}</p>
    </div>

    ${req.query.success ? '<div class="success-banner">Subscription activated successfully!</div>' : ''}

    <div class="card">
      <span class="tier-badge tier-${subscription.tier}">${subscription.tier.toUpperCase()}</span>
      <h2 style="font-size: 20px; margin-bottom: 4px;">Current Plan</h2>
      <p style="color: rgba(255,255,255,0.5); font-size: 13px;">${subscription.minutesLimit} minutes/month</p>
      
      <div class="usage-bar">
        <div class="usage-fill ${usage.remaining < 10 ? 'warning' : ''}" style="width: ${Math.min((subscription.minutesUsed / subscription.minutesLimit) * 100, 100)}%"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.5);">
        <span>${subscription.minutesUsed} min used</span>
        <span>${usage.remaining} min remaining</span>
      </div>

      <div class="stats-row">
        <div class="stat">
          <div class="stat-value">${stats.totalCalls}</div>
          <div class="stat-label">CALLS</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.bookingsCreated}</div>
          <div class="stat-label">BOOKINGS</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.totalCalls > 0 ? Math.round((stats.bookingsCreated / stats.totalCalls) * 100) : 0}%</div>
          <div class="stat-label">CONVERSION</div>
        </div>
      </div>

      ${subscription.stripeSubscriptionId ? `<button class="btn btn-secondary" onclick="openBillingPortal()">Manage Subscription</button>` : ''}
    </div>

    <h3 style="font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 16px; letter-spacing: 1px;">AVAILABLE PLANS</h3>

    <div class="tier-grid">
      <div class="tier-card ${subscription.tier === 'starter' ? 'current' : ''}" onclick="selectTier('starter')">
        <div class="tier-name">Starter</div>
        <div class="tier-price">$49<span>/mo</span></div>
        <div class="tier-minutes">60 minutes included</div>
      </div>
      <div class="tier-card ${subscription.tier === 'pro' ? 'current' : ''} popular" onclick="selectTier('pro')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="tier-name">Pro</div>
          <span class="popular-badge">POPULAR</span>
        </div>
        <div class="tier-price">$149<span>/mo</span></div>
        <div class="tier-minutes">200 minutes included</div>
      </div>
      <div class="tier-card ${subscription.tier === 'business' ? 'current' : ''}" onclick="selectTier('business')">
        <div class="tier-name">Business</div>
        <div class="tier-price">$349<span>/mo</span></div>
        <div class="tier-minutes">500 minutes included</div>
      </div>
    </div>
  </div>

  <script>
    const businessId = '${businessId}';
    const token = '${token || ''}';
    const currentTier = '${subscription.tier}';

    async function selectTier(tier) {
      if (tier === currentTier) return;
      
      try {
        const res = await fetch('/api/voice-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, tier, ownerToken: token }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Failed to start checkout');
        }
      } catch (err) {
        alert('Error starting checkout');
      }
    }

    async function openBillingPortal() {
      try {
        const res = await fetch('/api/voice-billing-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, ownerToken: token }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Failed to open billing portal');
        }
      } catch (err) {
        alert('Error opening billing portal');
      }
    }
  </script>
</body>
</html>`;
      
      res.send(html);
    } catch (error: any) {
      console.error("[Billing Page] Error:", error);
      res.status(500).send("Error loading billing page");
    }
  });

  // Stripe webhook for subscription events
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const sig = req.headers["stripe-signature"] as string;
      
      // For now, just handle subscription events without signature verification
      // In production, you'd verify the webhook signature
      const event = req.body;
      
      console.log("[Stripe Webhook] Event:", event.type);
      
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        const tier = session.metadata?.tier;
        
        if (businessId && tier) {
          const minutesMap: Record<string, number> = {
            starter: 60,
            pro: 200,
            business: 500,
          };
          
          await storage.updateVoiceSubscription(businessId, {
            tier,
            status: "active",
            minutesLimit: minutesMap[tier] || 60,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });

          console.log(`[Stripe Webhook] Activated ${tier} voice subscription for ${businessId}`);
        }
      }
      
      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const businessId = subscription.metadata?.businessId;
        
        if (businessId) {
          await storage.updateVoiceSubscription(businessId, {
            status: subscription.status === "active" ? "active" : "canceled",
            periodEnd: new Date(subscription.current_period_end * 1000),
          });
        }
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error("[Stripe Webhook] Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // === VOICE AGENT API ===
  
  // Helper function to extract text from HTML
  function extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000);
  }

  // Helper to extract internal links from HTML
  function extractInternalLinks(html: string, baseUrl: string): string[] {
    try {
      const urlObj = new URL(baseUrl);
      const domain = urlObj.origin;
      const links: string[] = [];
      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
        if (href.startsWith('/')) href = domain + href;
        else if (!href.startsWith('http')) href = domain + '/' + href;
        try {
          const linkUrl = new URL(href);
          if (linkUrl.origin === domain && !links.includes(linkUrl.href)) {
            links.push(linkUrl.href.split('#')[0].split('?')[0]);
          }
        } catch {}
      }
      return [...new Set(links)];
    } catch (e) {
      return [];
    }
  }

  // Get training data for specific business
  app.get("/api/businesses/:businessId/training", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const data = await db.select().from(trainingData)
        .where(eq(trainingData.businessId, businessId))
        .orderBy(desc(trainingData.createdAt));
      res.json(data);
    } catch (error) {
      console.error("Error fetching business training data:", error);
      res.status(500).json({ error: "Failed to fetch training data" });
    }
  });

  // Add Q&A pair for business training
  app.post("/api/businesses/:businessId/training/qa", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { question, answer } = req.body;

      if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }

      const [data] = await db.insert(trainingData).values({
        businessId,
        type: "qa_pair",
        question,
        answer,
      }).returning();

      res.status(201).json(data);
    } catch (error) {
      console.error("Error adding Q&A pair:", error);
      res.status(500).json({ error: "Failed to add Q&A pair" });
    }
  });

  // Crawl website for business training (supports multi-page)
  app.post("/api/businesses/:businessId/training/crawl", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { url, maxPages = 10 } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const crawledUrls = new Set<string>();
      const urlsToCrawl = [url];
      const results: any[] = [];
      const pageLimit = Math.min(maxPages, 50);

      console.log(`Starting multi-page crawl from: ${url} (max ${pageLimit} pages) for business ${businessId}`);

      while (urlsToCrawl.length > 0 && crawledUrls.size < pageLimit) {
        const currentUrl = urlsToCrawl.shift()!;
        if (crawledUrls.has(currentUrl)) continue;
        crawledUrls.add(currentUrl);

        try {
          console.log(`Crawling page ${crawledUrls.size}/${pageLimit}: ${currentUrl}`);
          const response = await fetch(currentUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookFlowBot/1.0)' },
          });

          if (!response.ok) continue;

          const html = await response.text();
          const textContent = extractTextFromHtml(html);

          if (textContent.length < 100) continue;

          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : currentUrl;

          const [data] = await db.insert(trainingData).values({
            businessId,
            type: "website_crawl",
            title,
            content: textContent,
            sourceUrl: currentUrl,
            status: "active",
          }).returning();

          results.push({ ...data, contentLength: textContent.length });

          if (crawledUrls.size < pageLimit) {
            const newLinks = extractInternalLinks(html, currentUrl);
            for (const link of newLinks) {
              if (!crawledUrls.has(link) && !urlsToCrawl.includes(link)) {
                urlsToCrawl.push(link);
              }
            }
          }
        } catch (err) {
          console.log(`Failed to crawl ${currentUrl}:`, err);
        }
      }

      console.log(`Crawl complete: ${results.length} pages saved`);

      res.status(201).json({
        pagesCrawled: results.length,
        results,
        message: `Successfully crawled ${results.length} page(s) from ${url}`,
      });
    } catch (error) {
      console.error("Error crawling website:", error);
      res.status(500).json({ error: "Failed to crawl website" });
    }
  });

  // Delete training data
  app.delete("/api/training/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(trainingData).where(eq(trainingData.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting training data:", error);
      res.status(500).json({ error: "Failed to delete training data" });
    }
  });

  // === VOICE AGENT CONFIG ===

  // Serve voice booking page (Vapi-powered streaming voice)
  app.get("/voice/:slug", async (req: Request, res: Response) => {
    try {
      const config = await getVoiceAgentConfig(req.params.slug);
      if (!config) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Check voice subscription usage limits
      const usage = await storage.checkVoiceMinutesAvailable(config.businessId);
      
      if (!usage.available) {
        // Return a user-friendly page when voice minutes are exhausted
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voice Booking Unavailable - ${config.businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #000 0%, #111 100%); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { text-align: center; max-width: 400px; }
    .icon { font-size: 64px; margin-bottom: 24px; opacity: 0.5; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 16px 32px; background: #fff; color: #000; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔇</div>
    <h1>Voice Booking Unavailable</h1>
    <p>${config.businessName}'s voice booking is temporarily unavailable. Please try again later or use the regular booking page.</p>
    <a href="/book/${req.params.slug}" class="btn">Book Online Instead</a>
  </div>
</body>
</html>`;
        return res.send(html);
      }

      const vapiPublicKey = process.env.VAPI_PUBLIC_KEY || "";

      // Build inline assistant configuration for Vapi
      const industryContext = INDUSTRY_CONTEXT[config.industry] || INDUSTRY_CONTEXT.consulting;
      const servicesList = config.services
        .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
        .join("\n");

      // Build knowledge from training data
      const training = await storage.getTrainingData(config.businessId);
      const knowledgeBase = training
        .filter(t => t.type === 'website_crawl' || t.type === 'qa_pair' || t.type === 'document')
        .map(t => {
          if (t.type === 'qa_pair') return `Q: ${t.question}\nA: ${t.answer}`;
          if (t.type === 'website_crawl' || t.type === 'document') {
            return `Source: ${t.title || t.sourceUrl}\nContent: ${t.content}`;
          }
          return '';
        })
        .filter(c => c !== '')
        .join("\n\n");

      const systemPrompt = `You are a friendly, helpful assistant for ${config.businessName}. Your role is to answer questions about the business and its services.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and informative
- Speak naturally and conversationally
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList}

${knowledgeBase ? `ADDITIONAL KNOWLEDGE BASE:\n${knowledgeBase}\n` : ""}

YOUR GOALS:
1. Greet callers warmly and introduce yourself as ${config.businessName}'s Informational Assistant
2. Answer questions about services, pricing, and what's included
3. Use the provided knowledge base to answer specific questions about the business
4. If customers want to book, politely direct them to use the Text Booking link on this page. Explain that they can see all available times and confirm their appointment there.

IMPORTANT BEHAVIOR:
- You are an INFORMATIONAL assistant, NOT a booking agent
- Do NOT attempt to book appointments or collect customer information
- When customers ask to book or make an appointment, say something like: "I'd be happy to help you book! Please use the 'Text Booking' link on this page - it's the easiest way to secure your appointment and see real-time availability."
- You can describe services and answer questions, but always direct booking requests to Text Booking

WHAT YOU CAN HELP WITH:
- Explaining what services are offered
- Describing pricing and what's included
- Answering general questions about the business using the knowledge base
- Providing information about duration and what to expect

CALL-TO-ACTION:
When customers want to book, always say: "For booking, please tap the 'Text Booking' link on this page. You'll be able to see all available times and complete your booking right there."

IMPORTANT:
- This is a ${config.industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and helpful`;

      const voiceMap: Record<string, string> = {
        salon: "EXAVITQu4vr4xnSDxMaL",
        wellness: "EXAVITQu4vr4xnSDxMaL",
        medical: "pNInz6obpgDQGcFmaJgB",
        consulting: "pNInz6obpgDQGcFmaJgB",
        fitness: "VR6AewLTigWG4xSOukaG",
        trades: "VR6AewLTigWG4xSOukaG",
        auto_detailing: "VR6AewLTigWG4xSOukaG",
      };

      const inlineAssistant = {
        firstMessage: `Hello, thank you for calling ${config.businessName}. I am the Informational Assistant for ${config.businessName}. I can answer questions about our services or check availability. How can I help you?`,
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }]
        },
        voice: {
          provider: "11labs",
          voiceId: voiceMap[config.industry] || "pNInz6obpgDQGcFmaJgB"
        }
      };

      if (!voiceBookingHtmlContent) {
        await loadVoiceAgentHtml();
      }

      // Inject data into template
      const html = voiceBookingHtmlContent
        .replace(/\{\{BUSINESS_NAME\}\}/g, config.businessName)
        .replace(/\{\{BUSINESS_SLUG\}\}/g, req.params.slug)
        .replace(/\{\{PUBLIC_KEY\}\}/g, vapiPublicKey)
        .replace(/\{\{INLINE_ASSISTANT\}\}/g, JSON.stringify(inlineAssistant));

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (error) {
      console.error("Error serving voice booking page:", error);
      res.status(500).send("Internal server error");
    }
  });

  // === NOTIFICATIONS API ===
  app.get("/api/voice/:slug/token", async (req: Request, res: Response) => {
    try {
      // Create an ephemeral token for OpenAI Realtime API (WebRTC)
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
          instructions: "You are a helpful booking assistant.",
          input_audio_transcription: { model: "whisper-1" }
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error creating session token:", error);
      res.status(500).json({ error: "Failed to create session token" });
    }
  });

  // Get voice agent config (for clients)
  app.get("/api/voice/:slug/config", async (req: Request, res: Response) => {
    try {
      const config = await getVoiceAgentConfig(req.params.slug);
      if (!config) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json({
        businessId: config.businessId,
        businessName: config.businessName,
        industry: config.industry,
        services: config.services,
        voice: config.voice,
      });
    } catch (error) {
      console.error("[VoiceAgent] Error getting config:", error);
      res.status(500).json({ error: "Failed to get voice agent config" });
    }
  });

  // Get welcome audio for voice agent
  app.get("/api/voice/:slug/welcome", async (req: Request, res: Response) => {
    try {
      const config = await getVoiceAgentConfig(req.params.slug);
      if (!config) {
        return res.status(404).json({ error: "Business not found" });
      }

      const audioBuffer = await createVoiceAgentWelcome(config);
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (error) {
      console.error("[VoiceAgent] Error generating welcome:", error);
      res.status(500).json({ error: "Failed to generate welcome message" });
    }
  });

  // Process voice message with streaming response
  app.post("/api/voice/:slug/message", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      console.log(`[VoiceAgent] Processing message for slug: ${slug}`);
      const config = await getVoiceAgentConfig(slug);
      if (!config) {
        console.error(`[VoiceAgent] Business not found for slug: ${slug}`);
        return res.status(404).json({ error: "Business not found" });
      }

      const { inputFormat = "wav", conversationHistory: conversationHistoryStr = "[]" } = req.body;
      const conversationHistory = typeof conversationHistoryStr === 'string' 
        ? JSON.parse(conversationHistoryStr) 
        : conversationHistoryStr;

      let audioBuffer: Buffer;
      
      const multerRequest = req as any;
      if (multerRequest.file) {
        audioBuffer = multerRequest.file.buffer;
        console.log(`[VoiceAgent] Received file ${multerRequest.file.originalname}, size: ${audioBuffer.length} bytes`);
      } else if (req.body.audio) {
        // Fallback for base64 if still sent
        audioBuffer = Buffer.from(req.body.audio, "base64");
        console.log(`[VoiceAgent] Received base64 audio, size: ${audioBuffer.length} bytes`);
      } else {
        console.error("[VoiceAgent] Missing audio in request");
        return res.status(400).json({ error: "Audio data is required" });
      }

      if (audioBuffer.length < 100) {
        console.error("[VoiceAgent] Audio buffer suspiciously small");
      }
      
      // Convert WebM to WAV if needed (from web client)
      if (inputFormat === "webm" || (multerRequest.file && multerRequest.file.mimetype === "audio/webm")) {
        try {
          const converted = await convertWebmToWav(audioBuffer);
          audioBuffer = Buffer.from(converted);
        } catch (convErr) {
          console.warn("[VoiceAgent] WebM conversion failed, trying direct:", convErr);
        }
      }

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream the voice agent response
      for await (const event of voiceAgentRespond(audioBuffer, config, conversationHistory, "wav")) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if ((res as any).flush) (res as any).flush();
      }

      res.end();
    } catch (error) {
      console.error("[VoiceAgent] Error processing message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", data: "Failed to process message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });

  // === WORKFLOWS API ===
  
  // Get available industry blueprints
  app.get("/api/workflows/blueprints", async (_req: Request, res: Response) => {
    const blueprintSummary = Object.entries(INDUSTRY_BLUEPRINTS).map(([industry, workflows]) => ({
      industry,
      count: workflows.length,
      workflows: workflows.map(w => ({
        name: w.name,
        description: w.description,
        triggerType: w.triggerType,
        actionType: w.actionType,
      })),
    }));
    res.json(blueprintSummary);
  });

  // Get workflows for a business (PROTECTED)
  app.get("/api/businesses/:businessId/workflows", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      const workflows = await storage.getWorkflows(businessId);
      res.json(workflows);
    } catch (error) {
      console.error("Error getting workflows:", error);
      res.status(500).json({ error: "Failed to get workflows" });
    }
  });

  // Create workflow (PROTECTED)
  app.post("/api/businesses/:businessId/workflows", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      const data = insertWorkflowSchema.parse({
        ...req.body,
        businessId,
      });
      const workflow = await storage.createWorkflow(data);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  // Initialize industry blueprints (PROTECTED)
  app.post("/api/businesses/:businessId/workflows/initialize", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { industry } = req.body;
      if (!industry) {
        return res.status(400).json({ error: "Industry is required" });
      }

      // Use authenticated business ID (auto-healed in dev mode if mismatched)
      const businessId = req.business?.id || req.params.businessId;
      console.log(`[Workflow] Initializing blueprints for business: ${businessId}, industry: "${industry}"`);
      
      const normalizedIndustry = industry.toLowerCase().trim();
      if (!INDUSTRY_BLUEPRINTS[normalizedIndustry as keyof typeof INDUSTRY_BLUEPRINTS]) {
        console.error(`[Workflow] Invalid industry requested: "${industry}"`);
        return res.status(400).json({ 
          error: "Invalid industry template",
          details: `Industry "${industry}" is not supported.`
        });
      }

      await initializeIndustryBlueprints(businessId, normalizedIndustry);
      
      const workflows = await storage.getWorkflows(businessId);
      res.status(201).json(workflows);
    } catch (error) {
      console.error("[Workflow] Error initializing blueprints:", error);
      res.status(500).json({ 
        error: "Failed to initialize blueprints",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update workflow (PROTECTED)
  app.patch("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      const ownerToken = req.headers["x-owner-token"] as string;
      const business = await storage.getBusiness(workflow.businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updates = insertWorkflowSchema.partial().parse(req.body);
      const updated = await storage.updateWorkflow(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // Delete workflow (PROTECTED)
  app.delete("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      const ownerToken = req.headers["x-owner-token"] as string;
      const business = await storage.getBusiness(workflow.businessId);
      if (!business || business.ownerToken !== ownerToken) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteWorkflow(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  // === BUSINESS THEMES API ===
  
  // Get theme for a business (public - for widget rendering)
  app.get("/api/businesses/:businessId/theme", async (req: Request, res: Response) => {
    try {
      const theme = await storage.getBusinessTheme(req.params.businessId);
      if (!theme) {
        // Return default theme
        return res.json({
          primaryColor: "#000000",
          accentColor: "#C5A059",
          backgroundColor: "#FFFFFF",
          textColor: "#1A1C1E",
          borderRadius: 12,
          glassBlurIntensity: 20,
          fontFamily: "Inter",
          buttonStyle: "rounded",
          showPoweredBy: true,
        });
      }
      res.json(theme);
    } catch (error) {
      console.error("Error getting theme:", error);
      res.status(500).json({ error: "Failed to get theme" });
    }
  });

  // Update theme (PROTECTED)
  app.put("/api/businesses/:businessId/theme", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertBusinessThemeSchema.parse({
        ...req.body,
        businessId: req.params.businessId,
      });
      const theme = await storage.createOrUpdateBusinessTheme(data);
      res.json(theme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating theme:", error);
      res.status(500).json({ error: "Failed to update theme" });
    }
  });

  // === API KEYS ===
  
  // Get API keys for a business (PROTECTED)
  app.get("/api/businesses/:businessId/api-keys", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keys = await storage.getApiKeys(req.params.businessId);
      // Don't expose the hash, just the prefix and metadata
      const safeKeys = keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: k.permissions,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      }));
      res.json(safeKeys);
    } catch (error) {
      console.error("Error getting API keys:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Create API key (PROTECTED)
  app.post("/api/businesses/:businessId/api-keys", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Generate a secure random API key
      const rawKey = `bf_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 10);

      const apiKey = await storage.createApiKey({
        businessId: req.params.businessId,
        name: req.body.name || "API Key",
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(req.body.permissions || ["read:services", "read:availability", "create:bookings"]),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        isActive: true,
      });

      // Return the raw key only once - it can't be retrieved later
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned on creation
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Delete API key (PROTECTED)
  app.delete("/api/api-keys/:id", async (req: Request, res: Response) => {
    try {
      // Get the API key to verify ownership
      const keys = await storage.getApiKeys(req.params.id);
      // This is a simplification - in production we'd need proper verification
      await storage.deleteApiKey(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // === FLOATING ACTION BUTTON WIDGET ===
  
  // Serve the floating action button script
  app.get("/api/widget/fab.js", async (req: Request, res: Response) => {
    const slug = req.query.slug as string;
    if (!slug) {
      return res.status(400).send("// Error: slug parameter required");
    }

    const business = await storage.getBusinessBySlug(slug);
    if (!business) {
      return res.status(404).send("// Error: Business not found");
    }

    const theme = await storage.getBusinessTheme(business.id);
    const origin = getEmbedOrigin(req);

    const fabScript = `
(function() {
  var config = {
    slug: "${slug}",
    primaryColor: "${theme?.primaryColor || "#000000"}",
    accentColor: "${theme?.accentColor || "#C5A059"}",
    borderRadius: ${theme?.borderRadius || 12},
    buttonStyle: "${theme?.buttonStyle || "rounded"}",
    origin: "${origin}"
  };

  function createFAB() {
    var fab = document.createElement("div");
    fab.id = "bookflow-fab";
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    
    var borderRadius = config.buttonStyle === "pill" ? "50%" : config.buttonStyle === "square" ? "8px" : "16px";
    
    fab.style.cssText = "position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:" + config.accentColor + ";border-radius:" + borderRadius + ";display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;transition:transform 0.3s ease,box-shadow 0.3s ease;color:#fff;";
    
    fab.onmouseenter = function() {
      fab.style.transform = "scale(1.1)";
      fab.style.boxShadow = "0 6px 30px rgba(0,0,0,0.4)";
    };
    fab.onmouseleave = function() {
      fab.style.transform = "scale(1)";
      fab.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
    };
    
    fab.onclick = function() {
      openBookingModal();
    };
    
    document.body.appendChild(fab);
  }

  function openBookingModal() {
    var overlay = document.createElement("div");
    overlay.id = "bookflow-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
    
    var modal = document.createElement("div");
    modal.style.cssText = "width:90%;max-width:480px;height:80%;max-height:700px;background:#fff;border-radius:" + config.borderRadius + "px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);transform:scale(0.9);transition:transform 0.3s ease;";
    
    var iframe = document.createElement("iframe");
    iframe.src = config.origin + "/book/" + config.slug;
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    setTimeout(function() {
      overlay.style.opacity = "1";
      modal.style.transform = "scale(1)";
    }, 10);
    
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.9)";
        setTimeout(function() {
          overlay.remove();
        }, 300);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFAB);
  } else {
    createFAB();
  }
})();
`;

    res.setHeader("Content-Type", "application/javascript");
    res.send(fabScript);
  });

  const httpServer = createServer(app);

  return httpServer;
}
