import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GeneratedService {
  name: string;
  description: string;
  duration: number;
  price: number;
  bufferTime: number;
}

export interface GeneratedAddon {
  name: string;
  description: string;
  price: number;
}

export interface GeneratedServicesResult {
  services: GeneratedService[];
  addons: GeneratedAddon[];
}

export async function generateServicesFromDescription(
  description: string,
  businessType?: string,
  currency?: string
): Promise<GeneratedServicesResult> {
  const systemPrompt = `You are an expert business consultant helping small businesses set up their booking services.
Given a natural language description of services, generate structured service definitions.

IMPORTANT: Intelligently separate MAIN SERVICES from ADD-ONS (extras):
- MAIN SERVICES: Core offerings that customers book as appointments (e.g., "Exterior Groom - Sedan $115", "Haircut $25")
- ADD-ONS (EXTRAS): Optional enhancements customers can add to a main service (e.g., "Leather conditioning $80", "Pet hair removal $55")

Guidelines:
- Extract individual services from the description
- If a service has vehicle-type pricing (Sedan/SUV/Van), create separate service entries for each
- Suggest appropriate durations in minutes (15, 30, 45, 60, 90, 120, etc.)
- Add buffer time between appointments (5-15 minutes for quick services, 15-30 for longer ones)
- Write professional, concise descriptions
- For add-ons, do NOT include duration (they are added to existing appointments)
- If something is labeled as "Extras", "A la carte", "Add-ons", or similar, put it in the addons array
- If unclear, make reasonable assumptions based on industry standards

Respond with a JSON object containing BOTH services and addons arrays.`;

  const userPrompt = `Business type: ${businessType || "General service business"}
Currency: ${currency || "USD"}

Description: "${description}"

Generate a JSON object with BOTH "services" (main bookable services) and "addons" (optional extras):
{
  "services": [{
    "name": "Service Name - Vehicle Type",
    "description": "Brief professional description",
    "duration": 60,
    "price": 115,
    "bufferTime": 15
  }],
  "addons": [{
    "name": "Add-on Name",
    "description": "Brief description of the add-on",
    "price": 55
  }]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{\"services\":[],\"addons\":[]}";
    console.log("[AI] Raw response length:", content.length);
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error("[AI] JSON parse error:", parseErr, "Content:", content);
      return { services: [], addons: [] };
    }
    
    const services: GeneratedService[] = [];
    const addons: GeneratedAddon[] = [];
    
    // Extract services array
    if (parsed.services && Array.isArray(parsed.services)) {
      services.push(...parsed.services);
    }
    
    // Extract addons array (check multiple possible keys)
    if (parsed.addons && Array.isArray(parsed.addons)) {
      addons.push(...parsed.addons);
    } else if (parsed.add_ons && Array.isArray(parsed.add_ons)) {
      addons.push(...parsed.add_ons);
    } else if (parsed.extras && Array.isArray(parsed.extras)) {
      addons.push(...parsed.extras);
    }
    
    console.log("[AI] Parsed:", services.length, "services,", addons.length, "addons");
    
    return { services, addons };
  } catch (error) {
    console.error("[AI] Error generating services:", error);
    throw error;
  }
}

// Customer Insights Types
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

export function analyzeCustomerInsights(
  customers: Array<{
    id: string;
    name: string;
    email: string;
    totalBookings: number | null;
    createdAt: Date | null;
  }>,
  bookings: Array<{
    customerId: string;
    serviceId: string;
    date: string;
    totalPrice: number;
    status: string;
  }>,
  services: Array<{
    id: string;
    name: string;
  }>
): CustomerInsightsResult {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Calculate customer metrics
  const customerMetrics = customers.map((customer) => {
    const customerBookings = bookings.filter(
      (b) => b.customerId === customer.id && b.status !== "cancelled"
    );
    const totalSpend = customerBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const lastBooking = customerBookings
      .map((b) => new Date(b.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    // Determine segment
    let segment: CustomerInsight["segment"] = "regular";
    const daysSinceCreation = customer.createdAt
      ? (now.getTime() - new Date(customer.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      : 999;

    if (daysSinceCreation < 30 && customerBookings.length <= 1) {
      segment = "new";
    } else if (customerBookings.length >= 5 || totalSpend >= 50000) {
      segment = "vip";
    } else if (lastBooking && lastBooking < ninetyDaysAgo) {
      segment = "at_risk";
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      segment,
      totalBookings: customerBookings.length,
      totalSpend: totalSpend / 100,
      lastBookingDate: lastBooking?.toISOString().split("T")[0] || null,
      avgBookingValue: customerBookings.length > 0 ? totalSpend / 100 / customerBookings.length : 0,
    };
  });

  // Service frequency
  const serviceFrequency = new Map<string, { count: number; revenue: number }>();
  bookings.forEach((b) => {
    if (b.status !== "cancelled") {
      const existing = serviceFrequency.get(b.serviceId) || { count: 0, revenue: 0 };
      serviceFrequency.set(b.serviceId, {
        count: existing.count + 1,
        revenue: existing.revenue + b.totalPrice,
      });
    }
  });

  const mostFrequentServices = Array.from(serviceFrequency.entries())
    .map(([serviceId, data]) => {
      const service = services.find((s) => s.id === serviceId);
      return {
        name: service?.name || "Unknown",
        count: data.count,
        revenue: data.revenue / 100,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Segment counts
  const vipCustomers = customerMetrics.filter((c) => c.segment === "vip");
  const atRiskCustomers = customerMetrics.filter((c) => c.segment === "at_risk");
  const newCustomers = customerMetrics.filter((c) => c.segment === "new");

  const totalSpendAll = customerMetrics.reduce((sum, c) => sum + c.totalSpend, 0);

  return {
    topCustomers: vipCustomers.sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5),
    atRiskCustomers: atRiskCustomers.slice(0, 5),
    newCustomers: newCustomers.slice(0, 5),
    mostFrequentServices,
    summary: {
      totalCustomers: customers.length,
      vipCount: vipCustomers.length,
      atRiskCount: atRiskCustomers.length,
      avgCustomerValue: customers.length > 0 ? totalSpendAll / customers.length : 0,
    },
  };
}

export async function generateSmartReminders(
  businessType: string,
  serviceTypes: string[]
): Promise<{ timing: string; message: string }[]> {
  const systemPrompt = `You are an expert in customer communication and reducing no-shows.
Generate smart reminder timing suggestions based on the business type and services.

Consider:
- Industry best practices for appointment reminders
- Customer behavior patterns
- Travel time considerations for mobile services
- Preparation time customers might need`;

  const userPrompt = `Business type: ${businessType}
Services: ${serviceTypes.join(", ")}

Suggest 3-4 reminder timings with brief explanation. Respond as JSON:
[{
  "timing": "24 hours before",
  "message": "Gives customers time to reschedule if needed"
}]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 512,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.reminders && Array.isArray(parsed.reminders)) {
      return parsed.reminders;
    }
    
    return [];
  } catch (error) {
    console.error("[AI] Error generating reminders:", error);
    throw error;
  }
}

// Upsell Suggestions Types
export interface UpsellSuggestion {
  name: string;
  description: string;
  price: number;
  reason: string;
}

export async function generateUpsellSuggestions(
  serviceName: string,
  serviceDescription: string,
  servicePrice: number,
  businessType?: string,
  currency?: string
): Promise<UpsellSuggestion[]> {
  const systemPrompt = `You are an expert at suggesting relevant add-on services that enhance the customer experience.
Generate 2-3 contextual upsell suggestions based on the main service being booked.

Guidelines:
- Suggestions should genuinely complement the main service
- Price add-ons reasonably (typically 20-50% of main service price)
- Focus on value-add, not just revenue
- Be specific to the service type
- Never suggest the same service
- Keep descriptions concise (under 50 characters)
- Make suggestions feel helpful, not pushy`;

  const userPrompt = `Main service: "${serviceName}"
Description: "${serviceDescription}"
Price: ${servicePrice} ${currency || "USD"}
Business type: ${businessType || "General service business"}

Generate 2-3 add-on suggestions as JSON array:
[{
  "name": "Add-on Name",
  "description": "Brief description",
  "price": 25,
  "reason": "Why this pairs well with the main service"
}]`;

  try {
    console.log("[AI Upsell] Generating suggestions for:", serviceName);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 512,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("[AI Upsell] Raw response:", content);
    const parsed = JSON.parse(content);
    
    // Handle various response formats
    let suggestions: UpsellSuggestion[] = [];
    
    if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions;
    } else if (parsed.addons && Array.isArray(parsed.addons)) {
      suggestions = parsed.addons;
    } else if (parsed.add_ons && Array.isArray(parsed.add_ons)) {
      suggestions = parsed.add_ons;
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          suggestions = parsed[key];
          break;
        }
      }
    }
    
    console.log("[AI Upsell] Parsed suggestions:", suggestions.length);
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error("[AI] Error generating upsell suggestions:", error);
    return [];
  }
}
