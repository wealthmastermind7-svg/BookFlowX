import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { INDUSTRY_CONTEXT, detectIndustry } from "./context4all";
import { 
  isGoogleCalendarConnected, 
  getGoogleBusyTimes, 
  filterSlotsWithGoogleBusy,
  pushBookingToGoogleCalendar 
} from "./googleCalendar";

const router = Router();

interface VapiToolCall {
  id?: string;
  name: string;
  parameters: Record<string, any>;
}

interface VapiWebhookPayload {
  message: {
    type: string;
    toolCalls?: VapiToolCall[];
    call?: {
      id: string;
      metadata?: {
        businessSlug?: string;
      };
    };
  };
}

router.post("/api/vapi/server-url", async (req: Request, res: Response) => {
  try {
    const payload = req.body as VapiWebhookPayload;
    const messageType = payload?.message?.type;

    console.log(`[Vapi Webhook] Received: ${messageType}`);

    if (messageType === "assistant-request") {
      const businessSlug = payload.message.call?.metadata?.businessSlug || 
                         (payload.message as any).assistantOverrides?.variableValues?.businessSlug ||
                         (payload.message as any).metadata?.businessSlug;
      
      console.log(`[Vapi Webhook] Assistant request for slug: ${businessSlug}`);
      
      if (!businessSlug) {
        console.warn("[Vapi Webhook] No business slug found in request. Payload:", JSON.stringify(payload, null, 2));
      }

      const business = await storage.getBusinessBySlug(businessSlug || "black-edition-auto-detailing-zpjd");
      if (!business) {
        return res.json({
          assistant: {
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant. The business could not be found. Apologize and ask them to check the booking link."
                }
              ]
            },
            voice: { provider: "11labs", voiceId: "pNInz6obpgDQGcFmaJgB" },
            firstMessage: "I'm sorry, but I couldn't find that business. Please check the booking link and try again."
          }
        });
      }

      // Enforcement: Check if business has minutes left
      const sub = await storage.getVoiceSubscription(business.id);
      if (sub && sub.minutesUsed >= sub.minutesLimit) {
        return res.json({
          assistant: {
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: "Trial minutes exhausted." }]
            },
            voice: { provider: "11labs", voiceId: "pNInz6obpgDQGcFmaJgB" },
            firstMessage: `I'm sorry, but ${business.name} has reached their voice booking limit for this month. Please use our online booking link instead.`
          }
        });
      }

      const services = await storage.getServices(business.id);
      const training = await storage.getTrainingData(business.id);
      
      const industry = detectIndustry(business.name, services[0]?.name || "");
      const industryContext = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

      const servicesList = services
        .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
        .join("\n");

      // Build knowledge from training data
      const knowledgeBase = training
        .filter(t => t.type === 'website_crawl' || t.type === 'qa_pair' || t.type === 'document')
        .map(t => {
          if (t.type === 'qa_pair') return `Q: ${t.question}\nA: ${t.answer}`;
          if (t.type === 'website_crawl' || t.type === 'document') {
            return `Source: ${t.title || t.sourceUrl}\nContent: ${t.content}`;
          }
          return '';
        })
        .filter(c => c !== '')
        .join("\n\n");

      const systemPrompt = `You are a friendly, helpful assistant for ${business.name}. Your role is to answer questions about the business and its services.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and informative
- Speak naturally and conversationally
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList}

${knowledgeBase ? `ADDITIONAL KNOWLEDGE BASE:\n${knowledgeBase}\n` : ""}

YOUR GOALS:
1. Greet callers warmly and introduce yourself as ${business.name}'s Informational Assistant
2. Answer questions about services, pricing, and what's included
3. Use the provided knowledge base to answer specific questions about the business
4. If customers want to book, politely direct them to use the Text Booking link on this page. Explain that they can see all available times and confirm their appointment there.

IMPORTANT BEHAVIOR:
- You are an INFORMATIONAL assistant, NOT a booking agent
- Do NOT attempt to book appointments or collect customer information
- When customers ask to book or make an appointment, say something like: "I'd be happy to help you book! Please use the 'Text Booking' link on this page - it's the easiest way to secure your appointment and see real-time availability."
- You can describe services and answer questions, but always direct booking requests to Text Booking

WHAT YOU CAN HELP WITH:
- Explaining what services are offered
- Describing pricing and what's included
- Answering general questions about the business using the knowledge base
- Providing information about duration and what to expect

CALL-TO-ACTION:
When customers want to book, always say: "For booking, please tap the 'Text Booking' link on this page. You'll be able to see all available times and complete your booking right there."

IMPORTANT:
- This is a ${industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and helpful`;

      const voiceMap: Record<string, string> = {
        salon: "EXAVITQu4vr4xnSDxMaL",
        wellness: "EXAVITQu4vr4xnSDxMaL",
        medical: "pNInz6obpgDQGcFmaJgB",
        consulting: "pNInz6obpgDQGcFmaJgB",
        fitness: "VR6AewLTigWG4xSOukaG",
        trades: "VR6AewLTigWG4xSOukaG",
        auto_detailing: "VR6AewLTigWG4xSOukaG",
      };

      return res.json({
        assistant: {
          firstMessage: `Hi there! I'm the assistant for ${business.name}. I can tell you all about our services, pricing, or what to expect. How can I help you today?`,
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            tools: [
              {
                type: "function",
                function: {
                  name: "get_available_slots",
                  description: "Check availability for a specific date to inform customers about open times. After showing availability, remind them to use Text Booking to complete their appointment.",
                  parameters: {
                    type: "object",
                    properties: {
                      date: {
                        type: "string",
                        description: "The date in YYYY-MM-DD format"
                      },
                      serviceName: {
                        type: "string",
                        description: "Optional service name to calculate duration-specific availability"
                      }
                    },
                    required: ["date"]
                  }
                }
              },
              {
                type: "function",
                function: {
                  name: "list_services",
                  description: "List all available services with their prices and durations",
                  parameters: {
                    type: "object",
                    properties: {},
                    required: []
                  }
                }
              }
            ]
          },
          voice: {
            provider: "11labs",
            voiceId: voiceMap[industry] || "pNInz6obpgDQGcFmaJgB"
          },
          serverUrl: process.env.REPLIT_DOMAINS?.split(",")[0] 
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/vapi/server-url`
            : `${req.protocol}://${req.get('host')}/api/vapi/server-url`,
          serverMessages: ["tool-calls", "end-of-call-report"]
        }
      });
    }

    if (messageType === "tool-calls") {
      const toolCalls = payload.message.toolCalls || [];
      const businessSlug = payload.message.call?.metadata?.businessSlug || 
                         (payload.message as any).assistantOverrides?.variableValues?.businessSlug ||
                         (payload.message as any).metadata?.businessSlug;
      const results: any[] = [];

      for (const toolCall of toolCalls) {
        console.log(`[Vapi] Tool call: ${toolCall.name}`, toolCall.parameters);
        
        try {
          let result: any;

          if (toolCall.name === "list_services") {
            const business = await storage.getBusinessBySlug(businessSlug || "");
            if (business) {
              const services = await storage.getServices(business.id);
              result = {
                services: services.map(s => ({
                  name: s.name,
                  price: `$${(s.price / 100).toFixed(2)}`,
                  duration: `${s.duration} minutes`,
                  description: s.description || ""
                }))
              };
            } else {
              result = { error: "Business not found" };
            }
          }

          else if (toolCall.name === "get_available_slots") {
            const { date, serviceName } = toolCall.parameters;
            const business = await storage.getBusinessBySlug(businessSlug || "");
            
            if (business) {
              const services = await storage.getServices(business.id);
              // Use first service if none specified
              const targetServiceName = serviceName || (services[0]?.name || "Service");
              const service = services.find(s => 
                s.name.toLowerCase().includes(targetServiceName.toLowerCase()) ||
                targetServiceName.toLowerCase().includes(s.name.toLowerCase())
              );
              
              let availability = await storage.getAvailability(business.id);
              
              // If no availability records exist, create default ones (Mon-Fri 9-5, Sat 10-2)
              if (!availability || availability.length === 0) {
                console.log(`[Vapi] No availability found for ${business.id}, creating defaults`);
                for (let day = 1; day <= 5; day++) {
                  await storage.setAvailability({
                    businessId: business.id,
                    dayOfWeek: day,
                    startTime: "09:00",
                    endTime: "17:00",
                    isActive: true,
                  });
                }
                await storage.setAvailability({
                  businessId: business.id,
                  dayOfWeek: 6,
                  startTime: "10:00",
                  endTime: "14:00",
                  isActive: true,
                });
                await storage.setAvailability({
                  businessId: business.id,
                  dayOfWeek: 0,
                  startTime: "09:00",
                  endTime: "17:00",
                  isActive: false,
                });
                availability = await storage.getAvailability(business.id);
              }

              if (service) {
                const bookings = await storage.getBookings(business.id);

                // Parse date string carefully - vapi might send ISO or simple YYYY-MM-DD
                const dateClean = date.split('T')[0];
                const [year, month, day] = dateClean.split('-').map(Number);
                // Create date in local business timezone to avoid local timezone shifts
                const tz = business.timezone || 'UTC';
                const { formatInTimeZone } = await import('date-fns-tz');
                const dayOfWeek = parseInt(formatInTimeZone(new Date(year, month - 1, day), tz, 'i')); // 1 (Mon) to 7 (Sun)
                const adjustedDayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek; // Convert to 0-6 (Sun-Sat)
                
                console.log(`[Vapi] Checking availability for date=${date} (clean=${dateClean}) in ${tz}: DayOfWeek=${adjustedDayOfWeek}`);
                
                const dayAvailability = availability.find(a => a.dayOfWeek === adjustedDayOfWeek);
                
                if (dayAvailability && dayAvailability.isActive) {
                  const slots: string[] = [];
                  const [startH, startM] = dayAvailability.startTime.split(':').map(Number);
                  const [endH, endM] = dayAvailability.endTime.split(':').map(Number);
                  
                  // Check if this is "today" to filter out past times
                  const now = new Date();
                  const isToday = now.getUTCFullYear() === year && 
                                  now.getUTCMonth() === (month - 1) && 
                                  now.getUTCDate() === day;

                  let currentH = startH;
                  let currentM = startM;

                  while (currentH < endH || (currentH === endH && currentM < endM)) {
                    const timeStr = `${currentH.toString().padStart(2, "0")}:${currentM.toString().padStart(2, "0")}`;
                    
                    // Skip past times if it's today
                    let skip = false;
                    if (isToday) {
                      const slotDate = new Date();
                      slotDate.setHours(currentH, currentM, 0, 0);
                      if (slotDate <= now) skip = true;
                    }

                    if (!skip) {
                      // Check if slot is already booked
                      const isBooked = bookings.some(b => b.date === dateClean && b.time === timeStr && b.status !== 'cancelled');
                      if (!isBooked) {
                        slots.push(timeStr);
                      }
                    }

                    // Increment by 30 mins
                    currentM += 30;
                    if (currentM >= 60) {
                      currentH += 1;
                      currentM = 0;
                    }
                  }

                  // Check Google Calendar for conflicts if connected
                  let finalSlots = slots;
                  try {
                    const gcalConnected = await isGoogleCalendarConnected(business.id);
                    if (gcalConnected) {
                      console.log(`[Vapi] Checking Google Calendar for conflicts on ${dateClean} for business ${business.id}`);
                      const busyTimes = await getGoogleBusyTimes(dateClean, dateClean, business.timezone || 'Pacific/Auckland', business.id);
                      finalSlots = filterSlotsWithGoogleBusy(slots, dateClean, busyTimes, service.duration);
                      console.log(`[Vapi] After Google Cal filter: ${finalSlots.length} slots (was ${slots.length})`);
                    }
                  } catch (gcalError) {
                    console.log(`[Vapi] Google Calendar not available, using internal slots only`);
                  }

                  console.log(`[Vapi] Found ${finalSlots.length} available slots for ${dateClean}`);
                  
                  result = { 
                    date: dateClean, 
                    availableSlots: finalSlots,
                    message: finalSlots.length > 0 
                      ? `I found ${finalSlots.length} slots on ${dateClean}. Available times are: ${finalSlots.join(", ")}.`
                      : `I'm sorry, we are fully booked for ${serviceName} on ${dateClean}. Would you like to check another day?`
                  };
                } else {
                  // Provide more helpful message with next available days
                  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const openDays = availability.filter(a => a.isActive).map(a => dayNames[a.dayOfWeek]);
                  
                  console.log(`[Vapi] Day ${dayOfWeek} (${dayNames[dayOfWeek]}) is not active. Open days: ${openDays.join(", ")}`);
                  result = { 
                    date, 
                    availableSlots: [],
                    message: openDays.length > 0
                      ? `Sorry, we're not open on ${dayNames[dayOfWeek]}. We're available on ${openDays.join(", ")}. Would you like to book on one of those days?`
                      : `Sorry, we're not open on that day. Please try another date.`
                  };
                }
              } else {
                result = { error: `Service "${serviceName}" not found. Please ask for available services.` };
              }
            } else {
              result = { error: "Business not found" };
            }
          }

          else if (toolCall.name === "create_booking") {
            // Voice assistant is now informational only - direct to Text Booking
            result = {
              message: "I can't book appointments directly, but you can easily complete your booking using the Text Booking link on this page. It will show you all available times and let you confirm your appointment right there.",
              action: "direct_to_text_booking"
            };
            console.log(`[Vapi] create_booking called but assistant is informational only - directing to Text Booking`);
          }

          else {
            result = { error: `Unknown function: ${toolCall.name}` };
          }

          results.push({
            toolCallId: toolCall.id,
            name: toolCall.name,
            result: JSON.stringify(result)
          });
        } catch (error: any) {
          console.error(`[Vapi] Tool error (${toolCall.name}):`, error);
          results.push({
            toolCallId: toolCall.id,
            name: toolCall.name,
            result: JSON.stringify({ error: error.message || "An error occurred" })
          });
        }
      }

      return res.json({ results });
    }

    if (messageType === "end-of-call-report") {
      console.log("[Vapi] Call ended:", payload.message);
      
      // Track call duration and log the call
      try {
        const callData = payload.message as any; // Vapi end-of-call-report has different structure
        const businessSlug = callData.call?.metadata?.businessSlug || callData.metadata?.businessSlug;
        const durationSeconds = callData.durationSeconds || callData.call?.durationSeconds || 0;
        const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute
        
        if (businessSlug && durationMinutes > 0) {
          const business = await storage.getBusinessBySlug(businessSlug);
          
          if (business) {
            // Log the call
            await storage.createVoiceCallLog({
              businessId: business.id,
              callId: callData.call?.id || callData.callId,
              durationSeconds,
              durationMinutes,
              customerPhone: callData.call?.customer?.number,
              customerName: callData.call?.metadata?.customerName,
              bookingCreated: callData.call?.metadata?.bookingCreated || false,
              bookingId: callData.call?.metadata?.bookingId,
              status: callData.endedReason === "customer-ended" || callData.endedReason === "assistant-ended" ? "completed" : "failed",
              cost: Math.round(durationMinutes * 15), // ~$0.15/min in cents
            });
            
            // Increment usage minutes
            await storage.incrementVoiceMinutes(business.id, durationMinutes);
            
            console.log(`[Vapi] Logged call: ${durationMinutes} minutes for ${business.name}`);
          }
        }
      } catch (trackingError) {
        console.error("[Vapi] Error tracking call:", trackingError);
        // Don't fail the webhook, just log the error
      }
      
      return res.json({ received: true });
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error("[Vapi Webhook] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/vapi/config/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const business = await storage.getBusinessBySlug(slug);
    
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID || "fbc1fe60-e500-4e20-9537-0fb1ade6cd56";
    const vapiPublicKey = process.env.VAPI_PUBLIC_KEY || "";

    return res.json({
      businessName: business.name,
      assistantId: vapiAssistantId,
      publicKey: vapiPublicKey
    });
  } catch (error: any) {
    console.error("[Vapi Config] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/vapi/assistant-config/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const business = await storage.getBusinessBySlug(slug);
    
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const services = await storage.getServices(business.id);
    const training = await storage.getTrainingData(business.id);
    const industry = detectIndustry(business.name, services[0]?.name || "");
    const industryContext = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

    const servicesList = services
      .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
      .join("\n");

    const knowledgeBase = training
      .filter(t => t.type === 'website_crawl' || t.type === 'qa_pair' || t.type === 'document')
      .map(t => {
        if (t.type === 'qa_pair') return `Q: ${t.question}\nA: ${t.answer}`;
        if (t.type === 'website_crawl' || t.type === 'document') {
          return `Source: ${t.title || t.sourceUrl}\nContent: ${t.content}`;
        }
        return '';
      })
      .filter(c => c !== '')
      .join("\n\n");

    const systemPrompt = `You are a friendly, helpful assistant for ${business.name}. Your role is to answer questions about the business and its services.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and informative
- Speak naturally and conversationally
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList || "No services configured yet."}

${knowledgeBase ? `ADDITIONAL KNOWLEDGE BASE:\n${knowledgeBase}\n` : ""}

YOUR GOALS:
1. Greet callers warmly and introduce yourself as ${business.name}'s Informational Assistant
2. Answer questions about services, pricing, and what's included
3. Use the provided knowledge base to answer specific questions about the business
4. If customers want to book, politely direct them to use the Text Booking link on this page. Explain that they can see all available times and confirm their appointment there.

IMPORTANT BEHAVIOR:
- You are an INFORMATIONAL assistant, NOT a booking agent
- Do NOT attempt to book appointments or collect customer information
- When customers ask to book or make an appointment, say something like: "I'd be happy to help you book! Please use the 'Text Booking' link on this page - it's the easiest way to secure your appointment and see real-time availability."
- You can describe services and answer questions, but always direct booking requests to Text Booking

WHAT YOU CAN HELP WITH:
- Explaining what services are offered
- Describing pricing and what's included
- Answering general questions about the business using the knowledge base
- Providing information about duration and what to expect

CALL-TO-ACTION:
When customers want to book, always say: "For booking, please tap the 'Text Booking' link on this page. You'll be able to see all available times and complete your booking right there."

IMPORTANT:
- This is a ${industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and helpful`;

    const voiceMap: Record<string, string> = {
      salon: "EXAVITQu4vr4xnSDxMaL",
      wellness: "EXAVITQu4vr4xnSDxMaL",
      medical: "pNInz6obpgDQGcFmaJgB",
      consulting: "pNInz6obpgDQGcFmaJgB",
      fitness: "VR6AewLTigWG4xSOukaG",
      trades: "VR6AewLTigWG4xSOukaG",
      auto_detailing: "VR6AewLTigWG4xSOukaG",
    };

    const assistantConfig = {
      name: `${business.name} Assistant`,
      firstMessage: `Hi there! I'm the assistant for ${business.name}. I can tell you all about our services, pricing, or what to expect. How can I help you today?`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        tools: [
          {
            type: "function",
            function: {
              name: "list_services",
              description: "List all available services with their prices and durations",
              parameters: {
                type: "object",
                properties: {},
                required: []
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_available_slots",
              description: "Get available time slots for a specific date and service",
              parameters: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    description: "The date in YYYY-MM-DD format"
                  },
                  serviceName: {
                    type: "string",
                    description: "The name of the service"
                  }
                },
                required: ["date", "serviceName"]
              }
            }
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: voiceMap[industry] || "pNInz6obpgDQGcFmaJgB"
      },
      serverMessages: ["tool-calls", "end-of-call-report"],
      metadata: {
        businessSlug: slug
      }
    };

    return res.json(assistantConfig);
  } catch (error: any) {
    console.error("[Assistant Config] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/vapi/public-key", async (req: Request, res: Response) => {
  const publicKey = process.env.VAPI_PUBLIC_KEY || "";
  return res.json({ publicKey });
});

export default router;
