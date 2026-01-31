import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface BookingContext {
  industry: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  customerType: "new" | "returning";
  bookingChannel: "qr" | "link" | "app" | "widget";
  timeOfDay: "morning" | "afternoon" | "evening";
  dayOfWeek: string;
  mobileService: boolean;
  availableAddons?: Array<{ name: string; price: number; duration: number }>;
  businessName: string;
}

export interface SmartSuggestion {
  type: "upsell" | "addon" | "timing" | "message";
  title: string;
  description: string;
  value?: string;
  confidence: number;
  reasoning: string;
}

export interface DynamicMessage {
  heroPhrase: string;
  confirmationTone: string;
  reminderStyle: string;
  ctaText: string;
}

export const INDUSTRY_CONTEXT: Record<string, { tone: string; verbs: string[]; values: string[] }> = {
  auto_detailing: {
    tone: "confident, premium, results-focused",
    verbs: ["SHINE", "RESTORE", "PERFECT", "PROTECT"],
    values: ["pristine finish", "showroom quality", "ceramic protection", "professional grade"],
  },
  salon: {
    tone: "elegant, pampering, transformative",
    verbs: ["ELEVATE", "TRANSFORM", "REFRESH", "RENEW"],
    values: ["self-care", "radiant beauty", "relaxation", "confidence"],
  },
  fitness: {
    tone: "energetic, motivational, empowering",
    verbs: ["IGNITE", "POWER", "ACHIEVE", "CONQUER"],
    values: ["strength", "endurance", "wellness", "peak performance"],
  },
  medical: {
    tone: "professional, caring, reassuring",
    verbs: ["HEAL", "RESTORE", "CARE", "SUPPORT"],
    values: ["expert care", "patient comfort", "wellness", "comprehensive treatment"],
  },
  consulting: {
    tone: "professional, insightful, strategic",
    verbs: ["STRATEGIZE", "ACCELERATE", "OPTIMIZE", "TRANSFORM"],
    values: ["expertise", "growth", "clarity", "results"],
  },
  trades: {
    tone: "reliable, skilled, trustworthy",
    verbs: ["BUILD", "FIX", "INSTALL", "COMPLETE"],
    values: ["quality workmanship", "reliability", "expertise", "satisfaction guaranteed"],
  },
  wellness: {
    tone: "calming, nurturing, holistic",
    verbs: ["BALANCE", "RESTORE", "NURTURE", "HARMONIZE"],
    values: ["inner peace", "holistic wellness", "mindfulness", "rejuvenation"],
  },
};

export function detectIndustry(businessName: string, serviceName: string): string {
  const combined = `${businessName} ${serviceName}`.toLowerCase();
  
  if (combined.match(/detail|auto|car|wash|ceramic|polish|wax/)) return "auto_detailing";
  if (combined.match(/salon|hair|beauty|nail|spa|facial|makeup/)) return "salon";
  if (combined.match(/gym|fitness|training|workout|yoga|pilates/)) return "fitness";
  if (combined.match(/doctor|dental|clinic|medical|therapy|chiro/)) return "medical";
  if (combined.match(/consult|coach|strategy|business|mentor/)) return "consulting";
  if (combined.match(/plumb|electric|hvac|repair|install|construct/)) return "trades";
  if (combined.match(/massage|wellness|healing|meditation|reiki/)) return "wellness";
  
  return "consulting";
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getDayOfWeek(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

export async function getSmartUpsellSuggestion(context: BookingContext): Promise<SmartSuggestion | null> {
  if (!context.availableAddons || context.availableAddons.length === 0) {
    return null;
  }

  const industryContext = INDUSTRY_CONTEXT[context.industry] || INDUSTRY_CONTEXT.consulting;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a premium booking assistant for ${context.businessName}, a ${context.industry.replace("_", " ")} business. 
Your tone is ${industryContext.tone}.
Your goal is to suggest ONE relevant add-on that genuinely benefits the customer, not push sales.

Guidelines:
- Only suggest if it makes sense for this specific booking context
- Consider time of day, service duration, and customer type
- Keep suggestions brief and premium-feeling
- Never be pushy - if no add-on fits well, say so

Respond in JSON format:
{
  "shouldSuggest": boolean,
  "addonName": string or null,
  "title": string (5-8 words, premium tone),
  "description": string (1 sentence, benefit-focused),
  "confidence": number (0-100),
  "reasoning": string (internal reasoning, 1 sentence)
}`
        },
        {
          role: "user",
          content: `Context:
- Service: ${context.serviceName} ($${(context.servicePrice / 100).toFixed(2)}, ${context.serviceDuration} min)
- Customer: ${context.customerType}
- Booking channel: ${context.bookingChannel}
- Time: ${context.timeOfDay} on ${context.dayOfWeek}
- Mobile service: ${context.mobileService ? "Yes" : "No"}

Available add-ons:
${context.availableAddons.map(a => `- ${a.name}: $${(a.price / 100).toFixed(2)}, ${a.duration} min`).join("\n")}

What's the most relevant add-on suggestion for this booking?`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    if (!result.shouldSuggest || !result.addonName) {
      return null;
    }

    return {
      type: "upsell",
      title: result.title || "Enhance Your Experience",
      description: result.description || "",
      value: result.addonName,
      confidence: result.confidence || 50,
      reasoning: result.reasoning || "",
    };
  } catch (error) {
    console.error("[Context4All] Error getting upsell suggestion:", error);
    return null;
  }
}

export async function getDynamicMessage(context: BookingContext): Promise<DynamicMessage> {
  const industryContext = INDUSTRY_CONTEXT[context.industry] || INDUSTRY_CONTEXT.consulting;
  const randomVerb = industryContext.verbs[Math.floor(Math.random() * industryContext.verbs.length)];
  const randomValue = industryContext.values[Math.floor(Math.random() * industryContext.values.length)];

  const defaults: DynamicMessage = {
    heroPhrase: randomVerb,
    confirmationTone: `Your ${context.serviceName} is confirmed`,
    reminderStyle: "friendly",
    ctaText: "BOOK NOW",
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You create ultra-premium, minimal messaging for a ${context.industry.replace("_", " ")} business.
Tone: ${industryContext.tone}
Values: ${industryContext.values.join(", ")}

Respond in JSON:
{
  "heroPhrase": string (1-2 words, powerful, uppercase),
  "confirmationTone": string (1 sentence, warm confirmation),
  "reminderStyle": "calm" | "friendly" | "urgent",
  "ctaText": string (2-3 words, action-oriented, uppercase)
}`
        },
        {
          role: "user",
          content: `Service: ${context.serviceName}
Business: ${context.businessName}
Customer type: ${context.customerType}
Time: ${context.timeOfDay}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      heroPhrase: result.heroPhrase || defaults.heroPhrase,
      confirmationTone: result.confirmationTone || defaults.confirmationTone,
      reminderStyle: result.reminderStyle || defaults.reminderStyle,
      ctaText: result.ctaText || defaults.ctaText,
    };
  } catch (error) {
    console.error("[Context4All] Error getting dynamic message:", error);
    return defaults;
  }
}

export function buildBookingContext(
  business: { name: string; industry?: string },
  service: { name: string; price: number; duration: number },
  options: {
    customerType?: "new" | "returning";
    bookingChannel?: "qr" | "link" | "app" | "widget";
    mobileService?: boolean;
    availableAddons?: Array<{ name: string; price: number; duration: number }>;
  } = {}
): BookingContext {
  const industry = business.industry || detectIndustry(business.name, service.name);

  return {
    industry,
    serviceName: service.name,
    servicePrice: service.price,
    serviceDuration: service.duration,
    customerType: options.customerType || "new",
    bookingChannel: options.bookingChannel || "link",
    timeOfDay: getTimeOfDay(),
    dayOfWeek: getDayOfWeek(),
    mobileService: options.mobileService || false,
    availableAddons: options.availableAddons,
    businessName: business.name,
  };
}

export function getRevenueInsightExplanation(
  percentageIncrease: number,
  context: BookingContext
): string {
  const industryContext = INDUSTRY_CONTEXT[context.industry] || INDUSTRY_CONTEXT.consulting;
  
  if (percentageIncrease > 20) {
    return `Customers booking ${context.serviceName} often add premium upgrades, but they're rarely offered during booking. Smart suggestions could unlock significant revenue.`;
  } else if (percentageIncrease > 10) {
    return `There's untapped potential in your ${context.serviceName} bookings. Contextual add-on suggestions at the right moment could boost revenue.`;
  } else {
    return `Your ${context.serviceName} pricing is well-optimized. Minor improvements through smart timing could still help.`;
  }
}
