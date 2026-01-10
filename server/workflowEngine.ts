import { storage } from "./storage";
import { sendBookingConfirmation } from "./email";
import type { Booking, Service, Customer, Business, Workflow } from "@shared/schema";

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
      description: "Send confirmation email when booking is created",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your appointment is confirmed!",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "48-Hour Color Prep Reminder",
      description: "Remind clients to prep for color services",
      triggerType: "booking_reminder",
      triggerConditions: JSON.stringify([
        { field: "service.name", operator: "contains", value: "Color" },
      ]),
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Prep reminder for your color appointment",
        templateType: "reminder",
        customBody: "Please arrive with clean, dry hair. Avoid using heavy styling products.",
      }),
      delayMinutes: -2880, // 48 hours before
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
      delayMinutes: 1440, // 24 hours after
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
      name: "1-Hour Class Reminder",
      description: "Remind members 1 hour before class",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your class starts in 1 hour",
        templateType: "reminder",
        customBody: "Don't forget your water bottle and towel!",
      }),
      delayMinutes: -60,
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
      name: "Document Request",
      description: "Request documents before high-value consultations",
      triggerType: "booking_confirmed",
      triggerConditions: JSON.stringify([
        { field: "service.price", operator: "greater_than", value: 20000 },
      ]),
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Please prepare the following documents",
        templateType: "custom",
        customBody: "To make the most of our consultation, please have the following ready: relevant contracts, financial statements, and any specific questions.",
      }),
      delayMinutes: 0,
    },
  ],
  medical: [
    {
      name: "Appointment Confirmation",
      description: "Confirm medical appointment",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your appointment is confirmed",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "24-Hour Reminder",
      description: "Remind patients 24 hours before",
      triggerType: "booking_reminder",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Appointment reminder for tomorrow",
        templateType: "reminder",
        customBody: "Please bring your insurance card and arrive 15 minutes early.",
      }),
      delayMinutes: -1440,
    },
  ],
  auto: [
    {
      name: "Service Confirmation",
      description: "Confirm auto service appointment",
      triggerType: "booking_created",
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Your service appointment is confirmed",
        templateType: "confirmation",
      }),
      delayMinutes: 0,
    },
    {
      name: "Deposit Required Notice",
      description: "Request deposit for high-value services",
      triggerType: "booking_created",
      triggerConditions: JSON.stringify([
        { field: "service.price", operator: "greater_than", value: 50000 },
      ]),
      actionType: "send_email",
      actionConfig: JSON.stringify({
        subject: "Deposit required for your service",
        templateType: "custom",
        customBody: "Due to the nature of this service, a 50% deposit is required to secure your appointment.",
      }),
      delayMinutes: 5,
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
  context: WorkflowContext
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
    });

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
        result = await executeEmailAction(actionConfig as EmailActionConfig, context);
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
    // Handle delayed workflows (for now, execute immediately - future: use job queue)
    if (workflow.delayMinutes && workflow.delayMinutes > 0) {
      console.log(`[Workflow] Delayed execution (${workflow.delayMinutes}min) for: ${workflow.name}`);
      // In production, this would schedule a job
      setTimeout(
        () => executeWorkflow(workflow, { ...context, business }),
        workflow.delayMinutes * 60 * 1000
      );
    } else {
      await executeWorkflow(workflow, { ...context, business });
    }
  }
}

export async function initializeIndustryBlueprints(
  businessId: string,
  industry: string
): Promise<void> {
  const blueprints = INDUSTRY_BLUEPRINTS[industry as keyof typeof INDUSTRY_BLUEPRINTS];
  if (!blueprints || blueprints.length === 0) {
    console.log(`[Workflow] No blueprints for industry: ${industry}`);
    return;
  }

  console.log(`[Workflow] Initializing ${blueprints.length} blueprints for industry: ${industry}`);

  for (const blueprint of blueprints) {
    // Ensure we have correct actionConfig and triggerConditions
    const workflowData = {
      name: blueprint.name,
      description: blueprint.description,
      triggerType: blueprint.triggerType,
      actionType: blueprint.actionType,
      actionConfig: blueprint.actionConfig,
      businessId,
      industryBlueprint: industry,
      isActive: true,
      isPilot: false,
      // Provide defaults if missing
      triggerConditions: (blueprint as any).triggerConditions || null,
      delayMinutes: blueprint.delayMinutes !== undefined ? blueprint.delayMinutes : 0
    };
    
    await storage.createWorkflow(workflowData);
  }
}
