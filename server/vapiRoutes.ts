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
      "messages": [
      {
        "role": "system",
        "content": "You are a professional voice booking receptionist for {{BUSINESS_NAME}}.\n\nABSOLUTE RULES:\n- You are NOT allowed to guess availability or times.\n- You MUST call get_available_slots before mentioning ANY time.\n- If you do not have availability data, ask for a date.\n- When a tool is running, wait silently for the result.\n- You MUST call create_booking to finalize a booking. Verbal confirmation alone is not allowed.\n\nVOICE STYLE:\n- Speak naturally, friendly, and concisely."
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
      const industry = detectIndustry(business.name, services[0]?.name || "");
      const industryContext = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.consulting;

      const knowledge = await storage.getBusinessKnowledge(business.id);

      const servicesList = services
        .map(s => `- ${s.name}: $${(s.price / 100).toFixed(2)} (${s.duration} minutes)`)
        .join("\n");

      const knowledgeContext = knowledge ? `
ABOUT THE BUSINESS:
${knowledge.aboutBusiness || "A professional service business."}

ADDITIONAL SERVICES INFO:
${knowledge.servicesDescription || ""}

HOURS OF OPERATION:
${knowledge.hoursOfOperation || "Please ask about availability."}

LOCATION:
${knowledge.locationInfo || ""}

FREQUENTLY ASKED QUESTIONS:
${knowledge.faqJson ? (() => {
  try {
    const faqs = JSON.parse(knowledge.faqJson);
    return faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  } catch { return ""; }
})() : ""}

OTHER INFO:
${knowledge.additionalInfo || ""}
` : "";

      const systemPrompt = `You are a friendly, knowledgeable voice assistant for ${business.name}.

PERSONALITY:
- Tone: ${industryContext.tone}
- Core values: ${industryContext.values.join(", ")}
- Be warm, helpful, and informative
- Speak naturally like a friendly receptionist
- Keep responses concise (2-3 sentences max)

AVAILABLE SERVICES:
${servicesList}
${knowledgeContext}

YOUR ROLE:
You are an INFORMATIONAL assistant. Your job is to:
1. Greet callers warmly
2. Answer questions about the business, services, pricing, and hours
3. Provide helpful information about what the business offers
4. When customers want to book, direct them to the Text Booking link

YOU DO NOT:
- Take bookings directly
- Collect customer emails or phone numbers
- Schedule appointments

WHEN CUSTOMERS WANT TO BOOK:
Say something like: "I'd love to help you book! Just tap the 'Text Booking' link below this chat - it'll take you right to our booking page where you can pick your perfect time slot."

Or: "To book an appointment, you can use the Text Booking button on this page. It's super easy and you'll be able to choose from all available times."

IMPORTANT:
- This is a ${industry.replace('_', ' ')} business.
- If you don't understand, ask them to repeat
- Keep responses SHORT - this is a voice call
- Be personable and helpful
- Always guide booking requests to the Text Booking link`;

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
                  name: "get_business_info",
                  description: "Get detailed information about the business including hours, location, and FAQs",
                  parameters: {
                    type: "object",
                    properties: {
                      infoType: {
                        type: "string",
                        description: "Type of info: 'hours', 'location', 'about', 'faq', or 'all'"
                      }
                    },
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
          firstMessage: `Hi there! Thanks for calling ${business.name}. I'm here to tell you all about our services and answer any questions. What would you like to know?`,
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

          else if (toolCall.name === "get_business_info") {
            const { infoType } = toolCall.parameters;
            const business = await storage.getBusinessBySlug(businessSlug || "");
            
            if (business) {
              const knowledge = await storage.getBusinessKnowledge(business.id);
              
              if (knowledge) {
                let faqs: any[] = [];
                try {
                  faqs = knowledge.faqJson ? JSON.parse(knowledge.faqJson) : [];
                } catch {}

                if (infoType === 'hours') {
                  result = { hours: knowledge.hoursOfOperation || "Please contact us for our current hours." };
                } else if (infoType === 'location') {
                  result = { location: knowledge.locationInfo || "Please contact us for location details." };
                } else if (infoType === 'about') {
                  result = { about: knowledge.aboutBusiness || "We are a professional service business." };
                } else if (infoType === 'faq') {
                  result = { 
                    faqs: faqs.length > 0 ? faqs : [{ question: "How do I book?", answer: "Use the Text Booking link on this page!" }]
                  };
                } else {
                  result = {
                    about: knowledge.aboutBusiness || "",
                    hours: knowledge.hoursOfOperation || "",
                    location: knowledge.locationInfo || "",
                    additionalInfo: knowledge.additionalInfo || "",
                    faqs: faqs
                  };
                }
              } else {
                result = { 
                  message: "Business information is being set up. Please ask about our services or use the Text Booking link to book.",
                  bookingTip: "To book an appointment, use the Text Booking link on this page."
                };
              }
            } else {
              result = { error: "Business not found" };
            }
          }

          else if (toolCall.name === "get_available_slots_deprecated") {
            // This tool is deprecated - we no longer do bookings via voice
            result = { 
              message: "To check availability and book, please use the Text Booking link on this page. It will show you all available times!",
              action: "direct_to_text_booking"
            };
          }

          else if (toolCall.name === "get_available_slots_old") {
            const { date, serviceName } = toolCall.parameters;
            const business = await storage.getBusinessBySlug(businessSlug || "");
            
            if (business) {
              const services = await storage.getServices(business.id);
              const targetServiceName = serviceName || (services[0]?.name || "Service");
              const service = services.find(s => 
                s.name.toLowerCase().includes(targetServiceName.toLowerCase()) ||
                targetServiceName.toLowerCase().includes(s.name.toLowerCase())
              );
              
              let availability = await storage.getAvailability(business.id);
              
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

                // Trigger workflow automations (like Postmark email)
                try {
                  const { triggerWorkflows } = await import("./workflowEngine");
                  console.log(`[Vapi] Triggering workflows for voice booking ${booking.id}`);
                  triggerWorkflows("booking_created", business.id, {
                    booking,
                    service: service || undefined,
                    customer: customer || undefined,
                  }).catch(err => console.error("[Vapi] Workflow trigger failed:", err));
                } catch (triggerError) {
                  console.error("[Vapi] Could not trigger workflows:", triggerError);
                }

                // Sync to Google Calendar if connected
                try {
                  const gcalConnected = await isGoogleCalendarConnected(business.id);
                  if (gcalConnected) {
                    const eventId = await pushBookingToGoogleCalendar({
                      id: booking.id,
                      businessId: business.id,
                      businessName: business.name,
                      serviceName: service.name,
                      customerName,
                      customerEmail,
                      date,
                      time,
                      duration: service.duration,
                      totalPrice: service.price
                    });
                    if (eventId) {
                      console.log(`[Vapi] Booking synced to Google Calendar: ${eventId}`);
                    }
                  }
                } catch (gcalError) {
                  console.log(`[Vapi] Google Calendar sync skipped`);
                }

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
6. ALWAYS call get_available_slots to verify availability BEFORE mentioning specific times or confirming a booking.

BOOKING PROCESS:
When a customer wants to book:
1. Ask which service they'd like
2. Ask for their preferred date and time
3. Call get_available_slots to confirm if that time works.
4. Ask for their name
5. Ask for their email address
6. CRITICAL: Spell back the email letter by letter for confirmation (e.g., "Let me confirm: J-O-H-N at G-M-A-I-L dot com, is that correct?")
7. If they correct you, spell it back again until confirmed
8. Use the create_booking function to complete the booking
9. Confirm the booking details

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
