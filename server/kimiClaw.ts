import { storage } from "./storage";
import { detectIndustry, INDUSTRY_CONTEXT } from "./context4all";

const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function kimiChat(messages: KimiMessage[], maxTokens = 2000): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error("MOONSHOT_API_KEY not configured");

  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "kimi-k2.5",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[KimiClaw] API error:", err);
    throw new Error(`Kimi API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function kimiChatJSON<T = any>(messages: KimiMessage[], maxTokens = 2000): Promise<T> {
  const raw = await kimiChat(messages, maxTokens);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Kimi response");
  return JSON.parse(jsonMatch[0]);
}

// ========== CUSTOM PERSONA ==========

export interface BusinessPersona {
  tone: string;
  greeting: string;
  signoff: string;
  sampleMessage: string;
}

const PERSONA_PRESETS: Record<string, { label: string; description: string }> = {
  warm_welcoming: { label: "Warm & Welcoming", description: "Friendly, approachable tone for hospitality and wellness" },
  professional_clinical: { label: "Professional & Clinical", description: "Formal, precise tone for healthcare and consulting" },
  energetic_motivating: { label: "Energetic & Motivating", description: "High-energy, inspiring tone for fitness and sports" },
  luxury_premium: { label: "Luxury & Premium", description: "Sophisticated, exclusive tone for high-end services" },
  casual_friendly: { label: "Casual & Friendly", description: "Laid-back, personable tone for neighborhood businesses" },
  confident_results: { label: "Confident & Results-Driven", description: "Bold, outcome-focused tone for auto and trades" },
};

export function getPersonaPresets() {
  return PERSONA_PRESETS;
}

export async function generatePersona(businessName: string, industry: string, presetKey: string): Promise<BusinessPersona> {
  const preset = PERSONA_PRESETS[presetKey];
  if (!preset) throw new Error("Unknown persona preset");

  const result = await kimiChatJSON<BusinessPersona>([
    {
      role: "system",
      content: `You are a branding expert. Generate a communication persona for a ${industry} business called "${businessName}". 
The desired tone is: ${preset.label} - ${preset.description}.

Respond in JSON:
{
  "tone": "2-3 word tone descriptor",
  "greeting": "A personalized greeting message this business would use (1 sentence)",
  "signoff": "A warm sign-off phrase (3-5 words)",
  "sampleMessage": "A sample booking confirmation message in this persona's voice (2-3 sentences)"
}`
    },
    {
      role: "user",
      content: `Business: ${businessName}\nIndustry: ${industry}\nTone preset: ${preset.label}`
    }
  ], 500);

  return result;
}

// ========== SMART SCHEDULING INTELLIGENCE ==========

export interface SchedulingInsight {
  peakHours: string[];
  slowPeriods: string[];
  recommendations: string[];
  optimalSlotSuggestion: string;
  revenueOpportunity: string;
}

export async function getSchedulingInsights(businessId: string): Promise<SchedulingInsight> {
  const [bookings, services, avail] = await Promise.all([
    storage.getBookings(businessId),
    storage.getServices(businessId),
    storage.getAvailability(businessId),
  ]);

  const bookingTimes = bookings.map(b => ({ time: b.time, date: b.date, service: b.serviceName || "Unknown", price: b.totalPrice }));
  const timeDistribution: Record<string, number> = {};
  const dayDistribution: Record<string, number> = {};

  bookingTimes.forEach(b => {
    const hour = b.time?.split(":")[0] || "12";
    timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
    const day = new Date(b.date).toLocaleDateString("en-US", { weekday: "long" });
    dayDistribution[day] = (dayDistribution[day] || 0) + 1;
  });

  const result = await kimiChatJSON<SchedulingInsight>([
    {
      role: "system",
      content: `You are a business scheduling analyst. Analyze booking patterns and provide actionable insights for optimizing appointment schedules.

Respond in JSON:
{
  "peakHours": ["array of peak booking hours like '10:00 AM', '2:00 PM'"],
  "slowPeriods": ["array of underutilized time slots"],
  "recommendations": ["3-4 specific, actionable recommendations"],
  "optimalSlotSuggestion": "One key suggestion for adding optimal new slots",
  "revenueOpportunity": "One sentence about potential revenue increase from optimization"
}`
    },
    {
      role: "user",
      content: `Business has ${bookings.length} total bookings across ${services.length} services.

Hourly distribution: ${JSON.stringify(timeDistribution)}
Daily distribution: ${JSON.stringify(dayDistribution)}
Services: ${services.map(s => `${s.name} ($${(s.price / 100).toFixed(2)}, ${s.duration}min)`).join(", ")}
Active availability: ${avail.filter(a => a.isActive).map(a => `Day ${a.dayOfWeek}: ${a.startTime}-${a.endTime}`).join(", ")}`
    }
  ], 800);

  return result;
}

// ========== PROACTIVE RE-ENGAGEMENT ==========

export interface ReengagementMessage {
  customerName: string;
  customerEmail: string;
  lastBookingDate: string;
  daysSinceLastVisit: number;
  suggestedMessage: string;
  subject: string;
  urgency: "low" | "medium" | "high";
}

export async function getReengagementSuggestions(businessId: string): Promise<ReengagementMessage[]> {
  const [customers, bookings, business] = await Promise.all([
    storage.getCustomers(businessId),
    storage.getBookings(businessId),
    storage.getBusiness(businessId),
  ]);

  if (!business || customers.length === 0) return [];

  const industry = detectIndustry(business.name, "");
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

  const customerLastBooking: Record<string, { date: string; service: string }> = {};
  bookings.forEach(b => {
    const existing = customerLastBooking[b.customerId];
    if (!existing || new Date(b.date) > new Date(existing.date)) {
      customerLastBooking[b.customerId] = { date: b.date, service: b.serviceName || "service" };
    }
  });

  const now = new Date();
  const inactiveCustomers = customers
    .filter(c => {
      const last = customerLastBooking[c.id];
      if (!last) return false;
      const daysSince = Math.floor((now.getTime() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 14;
    })
    .slice(0, 10);

  if (inactiveCustomers.length === 0) return [];

  const customerData = inactiveCustomers.map(c => {
    const last = customerLastBooking[c.id];
    const daysSince = Math.floor((now.getTime() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24));
    return { name: c.name, email: c.email, lastDate: last.date, lastService: last.service, daysSince };
  });

  const result = await kimiChatJSON<{ messages: ReengagementMessage[] }>([
    {
      role: "system",
      content: `You are a customer retention specialist for "${business.name}", a ${industry} business.
Tone: ${industryCtx.tone}

Generate personalized re-engagement messages for inactive customers. Each message should feel personal, not automated.

Respond in JSON:
{
  "messages": [
    {
      "customerName": "name",
      "customerEmail": "email",
      "lastBookingDate": "date",
      "daysSinceLastVisit": number,
      "subject": "Email subject line (personal, not salesy)",
      "suggestedMessage": "2-3 sentence personalized message referencing their last service",
      "urgency": "low|medium|high"
    }
  ]
}`
    },
    {
      role: "user",
      content: `Inactive customers:\n${customerData.map(c => `- ${c.name} (${c.email}): last visit ${c.daysSince} days ago for "${c.lastService}"`).join("\n")}`
    }
  ], 2000);

  return result.messages || [];
}

// ========== COMPETITOR RADAR ==========

export interface CompetitorBriefing {
  summary: string;
  competitors: Array<{
    name: string;
    strength: string;
    weakness: string;
    opportunity: string;
  }>;
  trendingInNiche: string[];
  actionItems: string[];
  generatedAt: string;
}

export async function getCompetitorRadar(businessId: string, city?: string): Promise<CompetitorBriefing> {
  const business = await storage.getBusiness(businessId);
  if (!business) throw new Error("Business not found");

  const industry = detectIndustry(business.name, "");
  const location = city || business.address || "your area";

  const result = await kimiChatJSON<CompetitorBriefing>([
    {
      role: "system",
      content: `You are a competitive intelligence analyst for service businesses. Provide a morning briefing about the competitive landscape.

Based on general industry knowledge and trends, generate a realistic competitive analysis. Focus on actionable insights, not generic advice.

Respond in JSON:
{
  "summary": "2-3 sentence executive summary of the competitive landscape",
  "competitors": [
    {
      "name": "Typical competitor type (e.g., 'Local Premium Detailer')",
      "strength": "Their key advantage",
      "weakness": "Where they fall short",
      "opportunity": "How to win against them"
    }
  ],
  "trendingInNiche": ["3-4 current trends in this industry"],
  "actionItems": ["3-4 specific things the business should do this week"],
  "generatedAt": "ISO timestamp"
}`
    },
    {
      role: "user",
      content: `Business: ${business.name}
Industry: ${industry}
Location: ${location}
Current services: ${(await storage.getServices(businessId)).map(s => s.name).join(", ") || "General services"}

Provide a competitive morning briefing.`
    }
  ], 1500);

  result.generatedAt = new Date().toISOString();
  return result;
}

// ========== REVIEW MANAGEMENT ==========

export interface ReviewDraft {
  reviewerName: string;
  rating: number;
  originalReview: string;
  draftResponse: string;
  tone: string;
  priority: "urgent" | "normal" | "low";
}

export async function generateReviewResponses(
  businessId: string,
  reviews: Array<{ reviewerName: string; rating: number; text: string; platform: string }>
): Promise<ReviewDraft[]> {
  const business = await storage.getBusiness(businessId);
  if (!business) throw new Error("Business not found");

  const industry = detectIndustry(business.name, "");
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

  const result = await kimiChatJSON<{ drafts: ReviewDraft[] }>([
    {
      role: "system",
      content: `You are a reputation management specialist for "${business.name}", a ${industry} business.
Tone: ${industryCtx.tone}

Draft professional, personalized responses to customer reviews. Rules:
- For positive reviews (4-5 stars): Thank them warmly, reference specifics, invite them back
- For neutral reviews (3 stars): Acknowledge feedback, offer improvement, be humble
- For negative reviews (1-2 stars): Apologize sincerely, take responsibility, offer to make it right offline
- Never be defensive or argumentative
- Keep responses under 80 words

Respond in JSON:
{
  "drafts": [
    {
      "reviewerName": "name",
      "rating": number,
      "originalReview": "their review text",
      "draftResponse": "your drafted response",
      "tone": "grateful|empathetic|apologetic|professional",
      "priority": "urgent|normal|low"
    }
  ]
}`
    },
    {
      role: "user",
      content: `Reviews to respond to:\n${reviews.map((r, i) => `${i + 1}. ${r.reviewerName} (${r.rating}/5 on ${r.platform}): "${r.text}"`).join("\n")}`
    }
  ], 2000);

  return result.drafts || [];
}

// ========== EMAIL MANAGEMENT ==========

export interface EmailDraft {
  category: "booking_inquiry" | "complaint" | "general" | "follow_up" | "vendor";
  subject: string;
  fromName: string;
  summary: string;
  draftReply: string;
  priority: "high" | "medium" | "low";
  suggestedAction: string;
}

export async function categorizeAndDraftEmails(
  businessId: string,
  emails: Array<{ from: string; subject: string; body: string }>
): Promise<EmailDraft[]> {
  const business = await storage.getBusiness(businessId);
  if (!business) throw new Error("Business not found");

  const industry = detectIndustry(business.name, "");
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

  const result = await kimiChatJSON<{ emails: EmailDraft[] }>([
    {
      role: "system",
      content: `You are an email management assistant for "${business.name}", a ${industry} business.
Tone: ${industryCtx.tone}

Categorize incoming emails and draft replies. Rules:
- Categorize each email as: booking_inquiry, complaint, general, follow_up, or vendor
- Set priority: high (complaints, urgent bookings), medium (general inquiries), low (vendor/spam)
- Draft concise, professional replies matching the business tone
- Suggest a follow-up action for each

Respond in JSON:
{
  "emails": [
    {
      "category": "category",
      "subject": "original subject",
      "fromName": "sender name",
      "summary": "1 sentence summary",
      "draftReply": "drafted response (2-3 sentences)",
      "priority": "high|medium|low",
      "suggestedAction": "what to do next"
    }
  ]
}`
    },
    {
      role: "user",
      content: `Emails to process:\n${emails.map((e, i) => `${i + 1}. From: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}\n`).join("\n---\n")}`
    }
  ], 2000);

  return result.emails || [];
}

// ========== AI MORNING BRIEFING (combines everything) ==========

export interface MorningBriefing {
  greeting: string;
  todaysSummary: string;
  bookingsToday: number;
  revenueToday: string;
  urgentItems: string[];
  customerInsight: string;
  competitorTip: string;
  motivationalNote: string;
  generatedAt: string;
}

export async function getMorningBriefing(businessId: string): Promise<MorningBriefing> {
  const [business, bookings, services, customers] = await Promise.all([
    storage.getBusiness(businessId),
    storage.getBookings(businessId),
    storage.getServices(businessId),
    storage.getCustomers(businessId),
  ]);

  if (!business) throw new Error("Business not found");

  const industry = detectIndustry(business.name, "");
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

  const today = new Date().toISOString().split("T")[0];
  const todaysBookings = bookings.filter(b => b.date === today);
  const todaysRevenue = todaysBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const totalCustomers = customers.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const result = await kimiChatJSON<MorningBriefing>([
    {
      role: "system",
      content: `You are the AI assistant for "${business.name}", a ${industry} business. Generate a concise, motivating morning briefing.
Tone: ${industryCtx.tone}

Respond in JSON:
{
  "greeting": "Personalized good morning message (1 sentence)",
  "todaysSummary": "Brief overview of what's ahead today (1-2 sentences)",
  "bookingsToday": ${todaysBookings.length},
  "revenueToday": "$${(todaysRevenue / 100).toFixed(2)}",
  "urgentItems": ["List of things needing immediate attention (max 3)"],
  "customerInsight": "One interesting insight about customer behavior (1 sentence)",
  "competitorTip": "One quick tip to stay ahead of competition (1 sentence)",
  "motivationalNote": "A brief, genuine motivational message (1 sentence)",
  "generatedAt": "${new Date().toISOString()}"
}`
    },
    {
      role: "user",
      content: `Dashboard data:
- Today's bookings: ${todaysBookings.length}
- Today's revenue: $${(todaysRevenue / 100).toFixed(2)}
- Pending bookings: ${pendingBookings}
- Total customers: ${totalCustomers}
- Total all-time revenue: $${(totalRevenue / 100).toFixed(2)}
- Services offered: ${services.map(s => s.name).join(", ")}
- Day: ${new Date().toLocaleDateString("en-US", { weekday: "long" })}`
    }
  ], 800);

  result.generatedAt = new Date().toISOString();
  return result;
}
