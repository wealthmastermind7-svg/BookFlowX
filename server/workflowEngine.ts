import { storage } from "./storage";
import { sendBookingConfirmation } from "./email";
import type { Booking, Service, Customer, Business, Workflow } from "@shared/schema";
import { db } from "./db";
import { businesses, workflowLogs, bookings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface WorkflowContext {
  booking?: Booking;
  service?: Service;
  customer?: Customer;
  business: Business;
}

interface TriggerCondition {
  field: string;
  operator: "equals" | "greater_than" | "less_than" | "contains";
  value: string | number;
}

interface EmailActionConfig {
  subject: string;
  templateType: "confirmation" | "reminder" | "followup" | "custom";
  customBody?: string;
}

interface WebhookActionConfig {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
}

type ActionConfig = EmailActionConfig | WebhookActionConfig;

export const INDUSTRY_BLUEPRINTS = {
  salon: [
    {
      name: "Booking Confirmation",
      description: "Confirm appointment booking immediately",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your appointment is confirmed!",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Remind clients 24 hours before service",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "See you tomorrow!",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
    {
      name: "2-Hour Reminder",
      description: "Last-minute reminder to reduce no-shows",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your appointment is in 2 hours",
        templateType: "reminder",
      }),
      delayMinutes: -120,
    },
    {
      name: "Post-Service Follow Up",
      description: "Send follow-up after service completion",
      triggerType: "booking_completed",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "How was your visit?",
        templateType: "followup",
      }),
      delayMinutes: 1440,
    },
  ],
  fitness: [
    {
      name: "Class Confirmation",
      description: "Confirm class booking immediately",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "You're booked for class!",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Remind members 24 hours before class",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Class reminder for tomorrow",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
    {
      name: "2-Hour Reminder",
      description: "Quick reminder 2 hours before class starts",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Class starts in 2 hours!",
        templateType: "reminder",
        customBody: "Don't forget your water bottle and towel!",
      }),
      delayMinutes: -120,
    },
  ],
  consulting: [
    {
      name: "Meeting Confirmation",
      description: "Confirm consultation booking",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your consultation is scheduled",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Remind clients 24 hours before meeting",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Meeting reminder for tomorrow",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
    {
      name: "1-Hour Quick Reminder",
      description: "Final reminder before your consultation",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Our meeting starts in 1 hour",
        templateType: "reminder",
      }),
      delayMinutes: -60,
    },
  ],
  medical: [
    {
      name: "Appointment Confirmation",
      description: "Confirm appointment booking",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your appointment is confirmed",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "48-Hour Planning Reminder",
      description: "Early reminder for planning and preparation",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Upcoming appointment reminder",
        templateType: "reminder",
        customBody: "Please bring any required documents and arrive 15 minutes early.",
      }),
      delayMinutes: -2880,
    },
    {
      name: "24-Hour Final Reminder",
      description: "Final confirmation 24 hours before",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Appointment reminder for tomorrow",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
  ],
  auto: [
    {
      name: "Service Confirmation",
      description: "Confirm service appointment",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your service appointment is confirmed",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Remind clients 24 hours before service",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Service reminder for tomorrow",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
    {
      name: "2-Hour Arrival Reminder",
      description: "Final reminder 2 hours before arrival",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Service starting in 2 hours",
        templateType: "reminder",
      }),
      delayMinutes: -120,
    },
  ],
  contractor: [
    {
      name: "Instant Job Confirmation",
      description: "Confirm service visit immediately after booking",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your service visit is scheduled",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Ensure access and site readiness 24 hours before",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Reminder: Service visit tomorrow",
        templateType: "reminder",
      }),
      delayMinutes: -1440,
    },
    {
      name: "2-Hour Arrival Reminder",
      description: "Technician arriving in 2 hours (best for trades)",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Technician arriving in 2 hours",
        templateType: "reminder",
      }),
      delayMinutes: -120,
    },
  ],
  custom: [],
};

function evaluateConditions(
  conditions: TriggerCondition[],
  context: WorkflowContext
): boolean {
  if (!conditions || conditions.length === 0) return true;

  for (const condition of conditions) {
    const [entity, field] = condition.field.split(".");
    let value: any;

    switch (entity) {
      case "service":
        value = context.service?.[field as keyof Service];
        break;
      case "customer":
        value = context.customer?.[field as keyof Customer];
        break;
      case "booking":
        value = context.booking?.[field as keyof Booking];
        break;
      case "business":
        value = context.business[field as keyof Business];
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case "equals":
        if (value !== condition.value) return false;
        break;
      case "greater_than":
        if (typeof value !== "number" || value <= Number(condition.value)) return false;
        break;
      case "less_than":
        if (typeof value !== "number" || value >= Number(condition.value)) return false;
        break;
      case "contains":
        if (typeof value !== "string" || !value.toLowerCase().includes(String(condition.value).toLowerCase())) return false;
        break;
    }
  }

  return true;
}

async function executeEmailAction(
  config: EmailActionConfig,
  context: WorkflowContext,
  delayMinutes?: number
): Promise<{ success: boolean; message: string }> {
  if (!context.booking || !context.customer || !context.service) {
    return { success: false, message: "Missing required context for email" };
  }

  try {
    await sendBookingConfirmation({
      businessName: context.business.name,
      customerName: context.customer.name,
      customerEmail: context.customer.email,
      serviceName: context.service.name,
      date: context.booking.date,
      time: context.booking.time,
      price: context.booking.totalPrice,
      currency: context.business.currency || "USD",
      confirmationNumber: context.booking.id.split("-")[0].toUpperCase(),
      isReminder: delayMinutes !== 0 && delayMinutes !== undefined,
      businessWebsite: context.business.website || undefined,
      businessPhone: context.business.phone || undefined,
    });

    // Mark email sent timestamp on booking based on reminder timing
    const now = new Date();
    if (delayMinutes === 0 || delayMinutes === undefined) {
      // Fetch fresh booking to check if confirmation was already sent by main route
      const currentBooking = await storage.getBooking(context.booking.id);
      if (currentBooking?.confirmationSentAt) {
        return { success: true, message: "Email already sent by main route" };
      }
      // Confirmation email (no delay or immediate send)
      await db.update(bookings).set({ confirmationSentAt: now }).where(eq(bookings.id, context.booking.id));
      console.log(`[Workflow] Marked confirmationSentAt for booking ${context.booking.id}`);
    } else if (delayMinutes <= -720) {
      // Long-range reminders (12h+ before): -720, -1440, -2880, etc. -> 24h bucket
      await db.update(bookings).set({ reminder24hSentAt: now }).where(eq(bookings.id, context.booking.id));
      console.log(`[Workflow] Marked reminder24hSentAt for booking ${context.booking.id} (delay: ${delayMinutes}min)`);
    } else if (delayMinutes < 0) {
      // Short-range reminders (< 12h before): -60, -120, -180, etc. -> 2h bucket
      await db.update(bookings).set({ reminder2hSentAt: now }).where(eq(bookings.id, context.booking.id));
      console.log(`[Workflow] Marked reminder2hSentAt for booking ${context.booking.id} (delay: ${delayMinutes}min)`);
    }

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    return { success: false, message: `Email failed: ${error}` };
  }
}

async function executeWebhookAction(
  config: WebhookActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: config.method === "POST" ? JSON.stringify(context) : undefined,
    });

    if (!response.ok) {
      return { success: false, message: `Webhook failed: ${response.statusText}` };
    }

    return { success: true, message: "Webhook executed successfully" };
  } catch (error) {
    return { success: false, message: `Webhook error: ${error}` };
  }
}

export async function executeWorkflow(
  workflow: Workflow,
  context: WorkflowContext
): Promise<void> {
  console.log(`[Workflow] Executing: ${workflow.name}`);

  // Parse and evaluate conditions
  if (workflow.triggerConditions) {
    try {
      const conditions = JSON.parse(workflow.triggerConditions) as TriggerCondition[];
      if (!evaluateConditions(conditions, context)) {
        console.log(`[Workflow] Conditions not met for: ${workflow.name}`);
        return;
      }
    } catch (error) {
      console.error(`[Workflow] Failed to parse conditions: ${error}`);
      return;
    }
  }

  // Create log entry
  const log = await storage.createWorkflowLog({
    workflowId: workflow.id,
    bookingId: context.booking?.id,
    status: workflow.isPilot ? "awaiting_approval" : "executing",
  });

  // If pilot mode, don't execute automatically
  if (workflow.isPilot) {
    console.log(`[Workflow] Awaiting approval (pilot mode): ${workflow.name}`);
    return;
  }

  // Execute action based on type
  let result: { success: boolean; message: string };

  try {
    const actionConfig = JSON.parse(workflow.actionConfig);

    switch (workflow.actionType) {
      case "send_email":
        result = await executeEmailAction(actionConfig as EmailActionConfig, context, workflow.delayMinutes ?? 0);
        break;
      case "webhook":
        result = await executeWebhookAction(actionConfig as WebhookActionConfig, context);
        break;
      default:
        result = { success: false, message: `Unknown action type: ${workflow.actionType}` };
    }

    await storage.updateWorkflowLog(log.id, {
      status: result.success ? "completed" : "failed",
      executedAt: new Date(),
      errorMessage: result.success ? undefined : result.message,
      responseData: JSON.stringify(result),
    });

    console.log(`[Workflow] ${result.success ? "Completed" : "Failed"}: ${workflow.name}`);
  } catch (error) {
    await storage.updateWorkflowLog(log.id, {
      status: "failed",
      executedAt: new Date(),
      errorMessage: String(error),
    });
    console.error(`[Workflow] Error executing ${workflow.name}:`, error);
  }
}

export async function triggerWorkflows(
  triggerType: string,
  businessId: string,
  context: Omit<WorkflowContext, "business">
): Promise<void> {
  console.log(`[Workflow] Trigger: ${triggerType} for business ${businessId}`);

  const business = await storage.getBusiness(businessId);
  if (!business) {
    console.error(`[Workflow] Business not found: ${businessId}`);
    return;
  }

  const workflows = await storage.getWorkflowsByTrigger(businessId, triggerType);
  console.log(`[Workflow] Found ${workflows.length} active workflows for trigger: ${triggerType}`);

  for (const workflow of workflows) {
    // Handle delayed workflows
    if (workflow.delayMinutes && workflow.delayMinutes !== 0) {
      // In production/reminder mode, we only execute if the time is right
      // This is a simplified version of a job queue
      if (triggerType === "booking_reminder") {
        // Reminders are triggered by the cron job, so we execute them
        await executeWorkflow(workflow, { ...context, business });
      } else if (workflow.delayMinutes > 0) {
        console.log(`[Workflow] Delayed execution (${workflow.delayMinutes}min) for: ${workflow.name}`);
        setTimeout(
          () => executeWorkflow(workflow, { ...context, business }),
          workflow.delayMinutes * 60 * 1000
        );
      }
    } else {
      await executeWorkflow(workflow, { ...context, business });
    }
  }
}

export async function processReminders(): Promise<void> {
  console.log("[Workflow] Checking for scheduled reminders...");
  const now = new Date();
  
  try {
    // Get all businesses to check their workflows
    // In a real high-scale app, we'd query by trigger_type in a smarter way
    const allBusinesses = await db.select().from(businesses);
    
    for (const business of allBusinesses) {
      const reminderWorkflows = await storage.getWorkflowsByTrigger(business.id, "booking_reminder");
      if (reminderWorkflows.length === 0) continue;

      const allBookings = await storage.getBookings(business.id);
      
      for (const workflow of reminderWorkflows) {
        const delay = workflow.delayMinutes || 0; // e.g., -1440 for 24h before
        
        for (const booking of allBookings) {
          if (booking.status === "cancelled" || booking.status === "completed") continue;

          // Parse booking date and time
          // Example: date="2026-01-21", time="12:30 PM"
          const [timeStr, ampm] = booking.time.split(" ");
          let [hours, minutes] = timeStr.split(":").map(Number);
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          
          const bookingDate = new Date(`${booking.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
          
          // Target time is bookingDate + delayMinutes
          const targetTime = new Date(bookingDate.getTime() + (delay * 60 * 1000));
          
          // If targetTime is within the last 15 minutes (our cron interval), trigger it
          const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
          
          if (targetTime <= now && targetTime > fifteenMinsAgo) {
            // Check if we already sent this reminder
            const existingLogs = await db.select().from(workflowLogs).where(
              and(
                eq(workflowLogs.workflowId, workflow.id),
                eq(workflowLogs.bookingId, booking.id),
                eq(workflowLogs.status, "completed")
              )
            );

            if (existingLogs.length === 0) {
              const service = await storage.getService(booking.serviceId);
              const customer = await storage.getCustomer(booking.customerId);
              
              await triggerWorkflows("booking_reminder", business.id, {
                booking,
                service: service || undefined,
                customer: customer || undefined
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Workflow] Error processing reminders:", error);
  }
}

function getIndustryBlueprints(industry: string) {
  if (!industry) return [];
  const normalized = industry.toLowerCase().trim();
  
  // Direct match first
  if (INDUSTRY_BLUEPRINTS[normalized as keyof typeof INDUSTRY_BLUEPRINTS]) {
    return INDUSTRY_BLUEPRINTS[normalized as keyof typeof INDUSTRY_BLUEPRINTS];
  }
  
  // Contractor-related industries use contractor blueprint
  const contractorIndustries = ["plumber", "electrician", "hvac", "cleaning", "landscaping", "handyman", "pest", "pool", "junk", "appliance"];
  if (contractorIndustries.some(c => normalized.includes(c))) {
    return INDUSTRY_BLUEPRINTS.contractor;
  }
  
  // Auto-related industries use auto blueprint
  if (normalized.includes("auto") || normalized.includes("car") || normalized.includes("vehicle")) {
    return INDUSTRY_BLUEPRINTS.auto;
  }
  
  return [];
}

export async function initializeIndustryBlueprints(
  businessId: string,
  industry: string
): Promise<void> {
  // Clear existing workflows for this business to prevent duplication
  console.log(`[Workflow] Clearing existing workflows for business: ${businessId} before initialization`);
  await storage.clearWorkflows(businessId);

  const blueprints = getIndustryBlueprints(industry);
  if (!blueprints || blueprints.length === 0) {
    console.log(`[Workflow] No blueprints found for industry: "${industry}"`);
    return;
  }

  console.log(`[Workflow] Initializing ${blueprints.length} blueprints for industry: "${industry}" for business: ${businessId}`);

  for (const blueprint of blueprints) {
    // Ensure we have correct actionConfig and triggerConditions
    const workflowData = {
      name: blueprint.name,
      description: blueprint.description || null,
      triggerType: blueprint.triggerType,
      actionType: blueprint.actionType,
      actionConfig: blueprint.actionConfig,
      businessId,
      industryBlueprint: industry,
      isActive: true,
      isPilot: false,
      triggerConditions: (blueprint as any).triggerConditions || null,
      delayMinutes: blueprint.delayMinutes !== undefined ? blueprint.delayMinutes : 0
    };
    
    try {
      console.log(`[Workflow] Creating workflow: "${workflowData.name}" for business: ${businessId}`);
      await storage.createWorkflow(workflowData);
    } catch (err: any) {
      console.error(`[Workflow] Failed to create workflow "${blueprint.name}":`, err);
      // Log more details about the error if possible
      if (err.message) console.error(`[Workflow] Error message: ${err.message}`);
      throw err;
    }
  }
  console.log(`[Workflow] Successfully initialized all ${blueprints.length} blueprints for industry: "${industry}"`);
}
