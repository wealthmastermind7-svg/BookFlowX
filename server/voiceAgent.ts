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
- CRITICAL: Spell back the email letter by letter for confirmation
- Thank them warmly at the end

EMAIL VERIFICATION:
- Email addresses are easy to mishear. ALWAYS spell them back.
- Say: "Let me confirm: J-O-H-N at G-M-A-I-L dot com, is that correct?"
- Ask them to spell it out if unsure: "Could you spell that email for me?"
- Only proceed with booking once email is confirmed

IMPORTANT:
- If you don't understand, ask them to repeat
- If a service isn't available, suggest alternatives
- Keep responses SHORT for voice - this is a phone call, not a text chat
- Be personable and use their name when they provide it`;
}

export async function createVoiceAgentWelcome(config: VoiceAgentConfig): Promise<Buffer> {
  const welcomeMessage = `Hi there! Thanks for calling ${config.businessName}. I'm here to help you book an appointment or answer any questions. What can I help you with today?`;
  
  try {
    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: config.voice || "nova",
      input: welcomeMessage,
      response_format: "mp3",
    });

    const arrayBuffer = await ttsResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[VoiceAgent] Welcome TTS error:", error);
    throw error;
  }
}

export async function* voiceAgentRespond(
  audioBuffer: Buffer,
  config: VoiceAgentConfig,
  conversationHistory: VoiceAgentMessage[] = [],
  inputFormat: "wav" | "mp3" | "webm" = "wav"
): AsyncGenerator<{ type: "user_transcript" | "audio" | "transcript" | "done" | "error"; data?: string }> {
  const startTime = Date.now();
  
  try {
    // Step 0: Validation
    if (audioBuffer.length < 3200) {
      console.warn(`[VoiceAgent] Audio too short: ${audioBuffer.length} bytes`);
      yield { type: "error", data: "I didn't catch that. Please hold the button longer and speak clearly." };
      return;
    }

    // Step 1: Speech-to-Text with gpt-4o-mini-transcribe
    console.log(`[VoiceAgent] STT starting, audio size: ${audioBuffer.length} bytes, format: ${inputFormat}`);
    
    const file = await toFile(audioBuffer, `audio.${inputFormat}`);
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });
    
    const userText = transcription.text?.trim();
    const sttDuration = Date.now() - startTime;
    console.log(`[VoiceAgent] STT completed in ${sttDuration}ms: "${userText}"`);

    if (!userText || userText.length < 2) {
      yield { type: "error", data: "I didn't catch that. Could you please speak a bit louder or closer to your device?" };
      return;
    }

    yield { type: "user_transcript", data: userText };

    // Step 2: Reasoning with gpt-4o-mini
    const reasoningStart = Date.now();
    const systemPrompt = buildVoiceAgentSystemPrompt(config);
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const assistantText = completion.choices[0]?.message?.content?.trim() || "";
    const reasoningDuration = Date.now() - reasoningStart;
    console.log(`[VoiceAgent] Reasoning completed in ${reasoningDuration}ms: "${assistantText}"`);

    if (!assistantText) {
      yield { type: "error", data: "I'm having trouble processing your request. Please try again." };
      return;
    }

    yield { type: "transcript", data: assistantText };

    // Step 3: Text-to-Speech with gpt-4o-mini-tts (streaming)
    const ttsStart = Date.now();
    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: config.voice || "nova",
      input: assistantText,
      response_format: "mp3",
    });

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString("base64");
    const ttsDuration = Date.now() - ttsStart;
    console.log(`[VoiceAgent] TTS completed in ${ttsDuration}ms, audio size: ${audioArrayBuffer.byteLength} bytes`);

    yield { type: "audio", data: audioBase64 };

    const totalDuration = Date.now() - startTime;
    console.log(`[VoiceAgent] Total response time: ${totalDuration}ms (STT: ${sttDuration}ms, Reasoning: ${reasoningDuration}ms, TTS: ${ttsDuration}ms)`);

    yield { type: "done", data: assistantText };
  } catch (error: any) {
    console.error("[VoiceAgent] Error:", error);
    const errorMessage = error?.message?.includes("audio") 
      ? "I had trouble with the audio. Please try speaking again."
      : "I'm sorry, something went wrong. Please try again.";
    yield { type: "error", data: errorMessage };
  }
}

export async function getVoiceAgentConfig(businessSlug: string): Promise<VoiceAgentConfig | null> {
  const business = await storage.getBusinessBySlug(businessSlug);
  if (!business) return null;

  const services = await storage.getServices(business.id);
  const industry = (business as any).industry || detectIndustry(business.name, services[0]?.name || "");

  // Select voice based on industry
  const voiceMap: Record<string, "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"> = {
    salon: "nova",
    wellness: "nova",
    medical: "echo",
    consulting: "echo",
    fitness: "onyx",
    trades: "alloy",
    auto_detailing: "alloy",
  };

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
    voice: voiceMap[industry] || "nova",
  };
}

export { INDUSTRY_CONTEXT, detectIndustry };
