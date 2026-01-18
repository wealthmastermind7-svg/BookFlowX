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
