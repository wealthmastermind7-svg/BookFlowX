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

export async function generateServicesFromDescription(
  description: string,
  businessType?: string,
  currency?: string
): Promise<GeneratedService[]> {
  const systemPrompt = `You are an expert business consultant helping small businesses set up their booking services.
Given a natural language description of services, generate structured service definitions.

Guidelines:
- Extract individual services from the description
- Suggest appropriate durations in minutes (15, 30, 45, 60, 90, 120, etc.)
- Suggest reasonable prices based on the service type and market rates
- Add buffer time between appointments (5-15 minutes for quick services, 15-30 for longer ones)
- Write professional, concise descriptions
- If unclear, make reasonable assumptions based on industry standards

Respond with a JSON array of services.`;

  const userPrompt = `Business type: ${businessType || "General service business"}
Currency: ${currency || "USD"}

Description: "${description}"

Generate services as JSON array with this structure:
[{
  "name": "Service Name",
  "description": "Brief professional description",
  "duration": 60,
  "price": 50,
  "bufferTime": 15
}]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.services && Array.isArray(parsed.services)) {
      return parsed.services;
    }
    
    return [];
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
