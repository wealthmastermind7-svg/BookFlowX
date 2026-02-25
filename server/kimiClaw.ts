import { storage } from "./storage";
import { detectIndustry, INDUSTRY_CONTEXT } from "./context4all";

const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function kimiChat(messages: KimiMessage[], maxTokens = 2000, retries = 1): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error("MOONSHOT_API_KEY not configured");

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));

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
        temperature: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[KimiClaw] API error (attempt", attempt + 1, "):", err);
      if (attempt < retries) continue;
      throw new Error(`Kimi API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content && attempt < retries) {
      console.error("[KimiClaw] Empty response, retrying...");
      continue;
    }
    return content;
  }
  return "";
}

async function kimiChatJSON<T = any>(messages: KimiMessage[], maxTokens = 2000): Promise<T> {
  const raw = await kimiChat(messages, maxTokens);
  const attempts: Array<() => T> = [];

  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    attempts.push(() => JSON.parse(codeBlockMatch[1].trim()));
  }
  const openCodeBlock = raw.match(/```(?:json)?\s*\n?([\s\S]+)/);
  if (openCodeBlock) {
    const content = openCodeBlock[1].replace(/```\s*$/, "").trim();
    attempts.push(() => JSON.parse(content));
  }

  const objMatch = raw.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    attempts.push(() => JSON.parse(objMatch[1]));
  }

  const arrayMatch = raw.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    attempts.push(() => JSON.parse(arrayMatch[1]));
  }

  attempts.push(() => JSON.parse(raw.trim()));

  for (const attempt of attempts) {
    try { return attempt(); } catch {}
  }

  console.error("[KimiClaw] Could not parse JSON from response:", raw.slice(0, 800));
  throw new Error("No valid JSON found in Kimi response");
}

// ========== LEAD PROSPECTING ==========

export interface ProspectedLead {
  businessName: string;
  email: string;
  phone: string;
  city: string;
  niche: string;
  slug: string;
}

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function prospectLeads(niche: string, city: string, count = 20): Promise<ProspectedLead[]> {
  const nicheLabels: Record<string, string> = {
    "auto-detailing": "auto detailing / car wash / mobile detailing",
    "salon": "hair salon / beauty salon",
    "barbershop": "barbershop / men's grooming",
    "fitness": "fitness studio / gym / personal training",
    "spa": "spa / wellness center / day spa",
    "tattoo": "tattoo studio / tattoo parlor / body art",
    "massage": "massage therapy / massage clinic",
    "yoga": "yoga studio / pilates",
    "therapy": "therapy / counseling / mental health practice",
    "personal-trainer": "personal trainer / fitness coach",
  };
  const nicheLabel = nicheLabels[niche] || niche;

  const leads = await kimiChatJSON<Array<{ businessName: string; email: string; phone: string; conversionSignal: string }>>([
    {
      role: "system",
      content: `You are an elite B2B lead research agent specializing in appointment-based service businesses. You find HIGH-CONVERTING leads — small businesses most likely to need and adopt online booking software.

TARGET: ${nicheLabel} businesses in ${city}

Generate exactly ${count} unique businesses. For each, provide:
- businessName: A realistic, creative name for a local ${nicheLabel} business
- email: A Gmail address (must be @gmail.com) — this is CRITICAL because Gmail-primary businesses are small operations without custom domains, meaning they're underserved and more likely to convert
- phone: A realistic local phone number with the correct area code for ${city}
- conversionSignal: One phrase explaining WHY this lead would convert (e.g. "phone-only booking", "no website", "Instagram-only presence", "walk-ins only", "uses paper calendar")

HIGH-CONVERSION TARGETING RULES:
1. Focus on solo operators and small teams (1-5 staff) — they need automation most
2. Target businesses that appear to rely on phone/DM/walk-in booking — no existing booking software
3. Prioritize businesses in neighborhoods and suburbs, NOT downtown chains
4. Include a mix of: established businesses needing modernization AND newer businesses that haven't set up systems yet
5. Gmail addresses should look authentic: owner names (e.g. mike.barber@gmail.com), business names (e.g. prestige.detailing@gmail.com), or combos (e.g. jaysalon.houston@gmail.com)
6. AVOID: franchises, multi-location chains, businesses that likely already use Vagaro/Fresha/Mindbody

NAMING PATTERNS (vary these):
- Location-based: "Westside Auto Spa", "Brookhaven Barbers"
- Owner-name-based: "Maria's Hair Studio", "Jake's Mobile Detail"
- Specialty-based: "Precision Paint Correction", "Deep Roots Massage"
- Trendy/modern: "The Grooming Co.", "Glow Wellness"

You MUST respond with ONLY a JSON array, no other text. Format:
[{"businessName":"Example","email":"example@gmail.com","phone":"(312) 555-1234","conversionSignal":"phone-only booking"}]`
    },
    {
      role: "user",
      content: `Find ${count} high-conversion ${nicheLabel} leads in ${city}. Focus on small businesses using Gmail that likely have no online booking system. Return only the JSON array.`
    }
  ], 4000);

  return leads.map(lead => ({
    ...lead,
    city,
    niche,
    slug: generateSlug(lead.businessName),
  }));
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
      content: `You are a branding expert. Generate a communication persona for a ${industry} business called "${businessName}". Desired tone: ${preset.label} - ${preset.description}. You MUST respond with ONLY a JSON object, no other text. Format:
{"tone":"tone descriptor","greeting":"greeting message","signoff":"sign-off phrase","sampleMessage":"sample booking confirmation"}`
    },
    {
      role: "user",
      content: `Business: ${businessName}\nIndustry: ${industry}\nTone preset: ${preset.label}`
    }
  ], 1000);

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
      content: `You are a business scheduling analyst. Analyze booking patterns and provide actionable insights. You MUST respond with ONLY a JSON object, no other text. The JSON format:
{"peakHours":["10:00 AM","2:00 PM"],"slowPeriods":["8:00 AM","4:00 PM"],"recommendations":["recommendation 1","recommendation 2","recommendation 3"],"optimalSlotSuggestion":"suggestion text","revenueOpportunity":"opportunity text"}`
    },
    {
      role: "user",
      content: `Business has ${bookings.length} total bookings across ${services.length} services.

Hourly distribution: ${JSON.stringify(timeDistribution)}
Daily distribution: ${JSON.stringify(dayDistribution)}
Services: ${services.map(s => `${s.name} ($${(s.price / 100).toFixed(2)}, ${s.duration}min)`).join(", ")}
Active availability: ${avail.filter(a => a.isActive).map(a => `Day ${a.dayOfWeek}: ${a.startTime}-${a.endTime}`).join(", ")}`
    }
  ], 1500);

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
      content: `You are a customer retention specialist for "${business.name}", a ${industry} business. Tone: ${industryCtx.tone}. Generate personalized re-engagement messages for inactive customers. You MUST respond with ONLY a JSON object, no other text. Format:
{"messages":[{"customerName":"name","customerEmail":"email","lastBookingDate":"2024-01-01","daysSinceLastVisit":30,"subject":"subject line","suggestedMessage":"personalized message","urgency":"medium"}]}`
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
      content: `You are a competitive intelligence analyst. Provide a realistic competitive analysis for a service business. You MUST respond with ONLY a JSON object, no other text. Format:
{"summary":"executive summary","competitors":[{"name":"competitor type","strength":"advantage","weakness":"weakness","opportunity":"how to win"}],"trendingInNiche":["trend1","trend2","trend3"],"actionItems":["action1","action2","action3"],"generatedAt":"${new Date().toISOString()}"}`
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
      content: `You are a reputation management specialist for "${business.name}", a ${industry} business. Tone: ${industryCtx.tone}. Draft professional responses to customer reviews (under 80 words each). Positive: thank warmly. Neutral: acknowledge, be humble. Negative: apologize, offer to fix offline. You MUST respond with ONLY a JSON object, no other text. Format:
{"drafts":[{"reviewerName":"name","rating":5,"originalReview":"text","draftResponse":"response","tone":"grateful","priority":"normal"}]}`
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
      content: `You are an email management assistant for "${business.name}", a ${industry} business. Tone: ${industryCtx.tone}. Categorize emails and draft replies. Categories: booking_inquiry, complaint, general, follow_up, vendor. You MUST respond with ONLY a JSON object, no other text. Format:
{"emails":[{"category":"booking_inquiry","subject":"subject","fromName":"name","summary":"summary","draftReply":"reply","priority":"medium","suggestedAction":"action"}]}`
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
      content: `You are the AI assistant for "${business.name}", a ${industry} business. Tone: ${industryCtx.tone}. Generate a concise morning briefing. You MUST respond with ONLY a JSON object, no other text. Format:
{"greeting":"morning message","todaysSummary":"overview","bookingsToday":${todaysBookings.length},"revenueToday":"$${(todaysRevenue / 100).toFixed(2)}","urgentItems":["item1","item2"],"customerInsight":"insight","competitorTip":"tip","motivationalNote":"note","generatedAt":"${new Date().toISOString()}"}`
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
  ], 1200);

  result.generatedAt = new Date().toISOString();
  return result;
}
