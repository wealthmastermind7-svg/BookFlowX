import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { INDUSTRY_CONTEXT, detectIndustry } from "./context4all";

const router = Router();

interface VapiToolCall {
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
      const businessSlug = payload.message.call?.metadata?.businessSlug || (payload.message as any).assistantOverrides?.variableValues?.businessSlug;
      
      console.log(`[Vapi Webhook] Assistant request for slug: ${businessSlug}`);
      
      if (!businessSlug) {
        console.warn("[Vapi Webhook] No business slug found in request");
      }

      const business = await storage.getBusinessBySlug(businessSlug || "black-edition-auto-detailing-zpjd");
      if (!business) {
        return res.json({
          assistant: {
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: "Business not found." }]
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
      const industry = detectIndustry(business.name, services[0]?.name || "");
      const industryContext = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

      const servicesList = services
        .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
        .join("\n");

      const systemPrompt = `You are a friendly, professional voice booking assistant for ${business.name}.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and efficient
- Speak naturally like a real receptionist
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList}

YOUR GOALS:
1. Greet callers warmly
2. Help them understand available services
3. Answer questions about pricing and duration
4. Guide them to book an appointment
5. Collect their name, email, and preferred time
6. Once you have service, name, email, date, and time, call the create_booking tool.

BOOKING PROCESS:
When a customer wants to book:
1. Ask which service they'd like
2. Ask for their preferred date and time
3. Ask for their name
4. Ask for their email address
5. CRITICAL: Spell back the email letter by letter for confirmation (e.g., "Let me confirm: J-O-H-N at G-M-A-I-L dot com, is that correct?")
6. If they correct you, spell it back again until confirmed
7. Use the create_booking function to complete the booking
8. Confirm the booking details

EMAIL VERIFICATION:
- Email addresses are easy to mishear. ALWAYS spell them back.
- Use NATO phonetic alphabet if helpful (Alpha, Bravo, Charlie, etc.)
- Ask them to spell it out if you're unsure: "Could you spell that email for me?"
- Common mishearings: "dot com" vs "dot calm", numbers vs letters (5 vs S)
- Only proceed with booking once email is confirmed

IMPORTANT:
- This is a ${industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and use their name when provided
- Always confirm booking details before finalizing`;

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
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            tools: [
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
              },
              {
                type: "function",
                function: {
                  name: "create_booking",
                  description: "Create a new booking for a customer",
                  parameters: {
                    type: "object",
                    properties: {
                      customerName: {
                        type: "string",
                        description: "The customer's full name"
                      },
                      customerEmail: {
                        type: "string",
                        description: "The customer's email address"
                      },
                      customerPhone: {
                        type: "string",
                        description: "The customer's phone number (optional)"
                      },
                      serviceName: {
                        type: "string",
                        description: "The name of the service to book"
                      },
                      date: {
                        type: "string",
                        description: "The booking date in YYYY-MM-DD format"
                      },
                      time: {
                        type: "string",
                        description: "The booking time in HH:MM format (24-hour)"
                      }
                    },
                    required: ["customerName", "customerEmail", "serviceName", "date", "time"]
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
          firstMessage: `Hi there! Thanks for calling ${business.name}. I'm here to help you book an appointment or answer any questions. What can I help you with today?`,
          serverUrl: process.env.REPLIT_DOMAINS?.split(",")[0] 
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/vapi/server-url`
            : `${req.protocol}://${req.get('host')}/api/vapi/server-url`,
          serverMessages: ["tool-calls", "end-of-call-report"]
        }
      });
    }

    if (messageType === "tool-calls") {
      const toolCalls = payload.message.toolCalls || [];
      const businessSlug = payload.message.call?.metadata?.businessSlug;
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
              const service = services.find(s => 
                s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
                serviceName.toLowerCase().includes(s.name.toLowerCase())
              );
              
              if (service) {
                const availability = await storage.getAvailability(business.id);
                const dayOfWeek = new Date(date).getDay();
                const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);
                
                if (dayAvailability && dayAvailability.isActive) {
                  const slots: string[] = [];
                  const startHour = parseInt(dayAvailability.startTime.split(":")[0]);
                  const endHour = parseInt(dayAvailability.endTime.split(":")[0]);
                  
                  for (let hour = startHour; hour < endHour; hour++) {
                    slots.push(`${hour.toString().padStart(2, "0")}:00`);
                    slots.push(`${hour.toString().padStart(2, "0")}:30`);
                  }
                  
                  result = { 
                    date, 
                    availableSlots: slots,
                    message: `Available times on ${date}: ${slots.join(", ")}`
                  };
                } else {
                  result = { 
                    date, 
                    availableSlots: [],
                    message: `Sorry, we're not open on that day. Please choose a different date.`
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
            const { customerName, customerEmail, customerPhone, serviceName, date, time } = toolCall.parameters;
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!customerEmail || !emailRegex.test(customerEmail)) {
              result = { 
                error: "Invalid email address format. Please ask the customer to spell out their email address again.",
                invalidEmail: customerEmail
              };
              console.log(`[Vapi] Invalid email rejected: ${customerEmail}`);
            } else {
            
            const business = await storage.getBusinessBySlug(businessSlug || "");
            
            if (business) {
              const services = await storage.getServices(business.id);
              const service = services.find(s => 
                s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
                serviceName.toLowerCase().includes(s.name.toLowerCase())
              );
              
              if (service) {
                let customer = await storage.getCustomerByEmail(business.id, customerEmail);
                if (!customer) {
                  customer = await storage.createCustomer({
                    businessId: business.id,
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone || null
                  });
                }

                const booking = await storage.createBooking({
                  businessId: business.id,
                  customerId: customer.id,
                  serviceId: service.id,
                  date,
                  time,
                  status: "confirmed",
                  totalPrice: service.price,
                  notes: "Booked via Voice Agent"
                });

                result = {
                  success: true,
                  bookingId: booking.id.substring(0, 8).toUpperCase(),
                  message: `Great! I've booked your ${service.name} appointment for ${date} at ${time}. Your confirmation number is ${booking.id.substring(0, 8).toUpperCase()}. You'll receive a confirmation email at ${customerEmail}.`
                };

                console.log(`[Vapi] Booking created: ${booking.id} for ${customerName}`);
              } else {
                result = { error: `Service "${serviceName}" not found.` };
              }
            } else {
              result = { error: "Business not found" };
            }
            }
          }

          else {
            result = { error: `Unknown function: ${toolCall.name}` };
          }

          results.push({
            name: toolCall.name,
            result: JSON.stringify(result)
          });
        } catch (error: any) {
          console.error(`[Vapi] Tool error (${toolCall.name}):`, error);
          results.push({
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
    const industry = detectIndustry(business.name, services[0]?.name || "");
    const industryContext = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

    const servicesList = services
      .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
      .join("\n");

    const systemPrompt = `You are a friendly, professional voice booking assistant for ${business.name}.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and efficient
- Speak naturally like a real receptionist
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList || "No services configured yet."}

YOUR GOALS:
1. Greet callers warmly
2. Help them understand available services
3. Answer questions about pricing and duration
4. Guide them to book an appointment
5. Collect their name, email, and preferred time

BOOKING PROCESS:
When a customer wants to book:
1. Ask which service they'd like
2. Ask for their preferred date and time
3. Ask for their name
4. Ask for their email address
5. CRITICAL: Spell back the email letter by letter for confirmation (e.g., "Let me confirm: J-O-H-N at G-M-A-I-L dot com, is that correct?")
6. If they correct you, spell it back again until confirmed
7. Confirm the booking details

EMAIL VERIFICATION:
- Email addresses are easy to mishear. ALWAYS spell them back.
- Use NATO phonetic alphabet if helpful (Alpha, Bravo, Charlie, etc.)
- Ask them to spell it out if you're unsure: "Could you spell that email for me?"
- Only proceed with booking once email is confirmed

IMPORTANT:
- This is a ${industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and use their name when provided`;

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
      name: `${business.name} Booking Assistant`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }]
      },
      voice: {
        provider: "11labs",
        voiceId: voiceMap[industry] || "pNInz6obpgDQGcFmaJgB"
      },
      firstMessage: `Hi there! Thanks for calling ${business.name}. I'm here to help you book an appointment or answer any questions. What can I help you with today?`,
      serverUrl: process.env.REPLIT_DOMAINS?.split(",")[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/vapi/server-url`
        : undefined,
      serverMessages: ["tool-calls", "end-of-call-report"],
      metadata: {
        businessSlug: slug
      }
    };

    return res.json(assistantConfig);
  } catch (error: any) {
    console.error("[Vapi Assistant Config] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/api/vapi/public-key", async (_req: Request, res: Response) => {
  const publicKey = process.env.VAPI_PUBLIC_KEY || "";
  if (!publicKey) {
    return res.status(500).json({ error: "VAPI_PUBLIC_KEY not configured" });
  }
  return res.json({ publicKey });
});

export default router;
