import OpenAI, { toFile } from "openai";
import { storage } from "./storage";
import { INDUSTRY_CONTEXT, detectIndustry } from "./context4all";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface VoiceAgentConfig {
  businessId: string;
  businessName: string;
  industry: string;
  services: Array<{ id: string; name: string; price: number; duration: number }>;
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
}

export interface VoiceAgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function buildVoiceAgentSystemPrompt(config: VoiceAgentConfig): string {
  const industryContext = INDUSTRY_CONTEXT[config.industry] || INDUSTRY_CONTEXT.consulting;
  
  const servicesList = config.services
    .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} min)`)
    .join("\n");

  return `You are a friendly, professional voice booking assistant for ${config.businessName}, a ${config.industry.replace("_", " ")} business.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and efficient
- Speak naturally like a real receptionist, not robotic
- Keep responses concise (2-3 sentences max for voice)

AVAILABLE SERVICES:
${servicesList}

YOUR GOALS:
1. Greet callers warmly and ask how you can help
2. Help them understand available services
3. Answer questions about pricing and duration
4. Guide them to book an appointment
5. Collect their name, email, and preferred time if booking

CONVERSATION GUIDELINES:
- Start with a warm greeting mentioning the business name
- Listen carefully to what they need
- Suggest appropriate services based on their needs
- If they want to book, ask for: their name, email, and preferred date/time
- Confirm details before finalizing
- Thank them warmly at the end

IMPORTANT:
- If you don't understand, ask them to repeat
- If a service isn't available, suggest alternatives
- Keep responses SHORT for voice - this is a phone call, not a text chat
- Be personable and use their name when they provide it`;
}

export async function createVoiceAgentWelcome(config: VoiceAgentConfig): Promise<Buffer> {
  const industryContext = INDUSTRY_CONTEXT[config.industry] || INDUSTRY_CONTEXT.consulting;
  const randomVerb = industryContext.verbs[Math.floor(Math.random() * industryContext.verbs.length)];
  
  const welcomeMessage = `Hi there! Thanks for calling ${config.businessName}. I'm here to help you book an appointment or answer any questions. What can I help you with today?`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-audio-mini",
    modalities: ["text", "audio"],
    audio: { voice: config.voice || "nova", format: "mp3" },
    messages: [
      { role: "system", content: "You are a text-to-speech assistant. Repeat the following message exactly as written with a warm, friendly tone." },
      { role: "user", content: welcomeMessage },
    ],
  });

  const audioData = (response.choices[0]?.message as any)?.audio?.data ?? "";
  return Buffer.from(audioData, "base64");
}

export async function* voiceAgentRespond(
  audioBuffer: Buffer,
  config: VoiceAgentConfig,
  conversationHistory: VoiceAgentMessage[] = [],
  inputFormat: "wav" | "mp3" = "wav"
): AsyncGenerator<{ type: "user_transcript" | "audio" | "transcript" | "done" | "error"; data?: string }> {
  try {
    const file = await toFile(audioBuffer, `audio.${inputFormat}`);
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });
    const userText = transcription.text;

    yield { type: "user_transcript", data: userText };

    const systemPrompt = buildVoiceAgentSystemPrompt(config);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userText },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-audio-mini",
      modalities: ["text", "audio"],
      audio: { voice: config.voice || "nova", format: "pcm16" },
      messages,
      stream: true,
    });

    let assistantTranscript = "";

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;

      if (delta?.audio?.transcript) {
        assistantTranscript += delta.audio.transcript;
        yield { type: "transcript", data: delta.audio.transcript };
      }

      if (delta?.audio?.data) {
        yield { type: "audio", data: delta.audio.data };
      }
    }

    yield { type: "done", data: assistantTranscript };
  } catch (error) {
    console.error("[VoiceAgent] Error:", error);
    yield { type: "error", data: "I'm sorry, I had trouble understanding. Could you please repeat that?" };
  }
}

export async function getVoiceAgentConfig(businessSlug: string): Promise<VoiceAgentConfig | null> {
  const business = await storage.getBusinessBySlug(businessSlug);
  if (!business) return null;

  const services = await storage.getServices(business.id);
  const industry = (business as any).industry || detectIndustry(business.name, services[0]?.name || "");

  return {
    businessId: business.id,
    businessName: business.name,
    industry,
    services: services.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
    voice: "nova",
  };
}

export { INDUSTRY_CONTEXT, detectIndustry };
