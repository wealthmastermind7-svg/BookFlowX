# BookFlow - Multi-Tenancy Booking Platform MVP

## Overview
BookFlow is a scalable multi-tenant booking platform for businesses, offering a public booking flow for customers and a comprehensive admin dashboard for owners. It emphasizes a premium user experience with sophisticated design, oversized typography, and cinematic animations. The platform aims to be an app-store-ready solution for appointment and service management across various business verticals.

## User Preferences
- **Communication Style**: I prefer clear, concise, and direct communication.
- **Explanation Style**: Provide detailed explanations for complex concepts or decisions.
- **Workflow**: I prefer an iterative development approach.
- **Interaction**: Ask before making major architectural changes or introducing new dependencies.
- **Codebase Changes**:
    - Do not change the fundamental premium black & white color scheme.
    - Prioritize robust error handling and graceful fallbacks.
    - Ensure new features integrate seamlessly with existing haptic feedback patterns.
    - When updating dependencies, prioritize stability and production readiness.

## System Architecture
BookFlow utilizes a decoupled frontend and backend architecture.

### UI/UX Decisions
- **Color Palette**: Premium black & white (`Pure Black`, `Charcoal`, `Graphite`, `Smoke`, `Silver`, `Pearl`).
- **Typography**: Oversized hierarchy (`Display 72-96px`, `H1 48-56px`, `Body 18-24px`).
- **Animation**: Spring physics with cinematic transitions (400ms ease-out).
- **Components**: Custom Circular Meters, Animated Cards, and Line Graphs with Bezier curves.
- **Haptic Feedback**: Comprehensive haptic feedback (Light, Medium, Heavy) on all interactive elements.

### Technical Implementations
- **Frontend**: React Native (Expo) for cross-platform mobile and web, featuring a 5-tab admin dashboard and public booking flow. API communication is managed via `client/lib/api.ts` with resilient environment detection.
- **Backend**: Express.js server providing a multi-tenant REST API, using Drizzle ORM for PostgreSQL.
- **Database**: PostgreSQL with a multi-tenant schema for `businesses`, `services`, `customers`, `bookings`, `availability`, and `pushTokens`.
- **Navigation**: `MainTabNavigator` for admin and `BookingFlowNavigator` for public access.

### Feature Specifications
- **Dashboard**: Revenue metrics and booking graphs, with a toggle for "This Week" (top 3) or "All" upcoming bookings.
- **Management**: CRUD for services and customer listings.
- **Public Booking Flow**: A 4-screen process (Service → Time → Checkout → Confirmation) accessible via unique business slugs.
- **Demo Data**: Multi-business-type demo data (14 verticals including contractors).
- **Utilities**: QR Code Generation for booking links and an embeddable booking widget (Calendly-style).
- **Future Roadmap**:
    - **Google Business Profile (GBP)**: Sync leads and manage reviews via Google My Business API.
    - **Facebook/Instagram**: Meta Graph API integration for social media leads.
    - **WhatsApp Business**: Real-time customer communication via WhatsApp Cloud API.
    - **Webchat Widget**: Integrated real-time chat for business websites.
    - **Conversation AI**:
        - **Automated Chatbot**: AI-driven responses to common customer queries (e.g., "What services do you offer?").
        - **Bot Training**: Ability to train the AI using web crawling (e.g., crawling the business's website) and custom Q&A pairs.
        - **Lead Conversion**: Automated prompts to start free trials or book services within the chat flow.
        - **Intent Configuration**: Customizable conversation paths based on customer intent (General Question, Booking Request, etc.).
        - **AI Voice Agents**:
            - **Inbound/Outbound Call Handling**: Dedicated AI agents for handling phone calls with customizable personalities and goals.
            - **Agent Goals**: Specific objectives for agents, such as gathering contact information (Name, Email, Address, Issue).
            - **Instructional Scripting**: Advanced prompting for objection handling, assurance of prompt support, and professional call conclusion.
            - **Pilot Modes**: Toggle between "Off", "Suggestive" (human-in-the-loop), and "Auto Pilot" (fully autonomous) modes.
            - **Channel Support**: Unified AI deployment across SMS, Instagram, Facebook, and Live Chat.
    - **Workflow Automation**: Automated lead engagement and booking triggers across all integrated platforms.

### System Design Choices
- **Multi-Tenancy**: Implemented at API and database levels for data isolation.
- **API Connectivity**: `getApiUrl()` handles dynamic environment detection for development and production.
- **Error Handling**: Client-side retry logic and server-side checks.
- **Production Readiness**: Focus on core features with iOS-specific lifecycle handling for data persistence.
- **Multi-Tenant Security**: Token-based ownership verification (`ownerToken`) for admin routes, ensuring data isolation and preventing cross-tenant access. Public routes remain open.

## External Dependencies
- **React Native (Expo)**: Frontend framework.
- **Express.js**: Backend web framework.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Database ORM.
- **RevenueCat**: In-app purchase & subscription management.
- **Resend**: Email service for booking confirmations.
  - Sender: `bookings@confirmbooking.online` (verified domain)
  - Triggers on booking creation when customer name and email are provided
  - Test endpoint: `POST /api/test-email` with `{ "email": "..." }`

## Recent Changes (January 2026)
- **Email Service Migration**: Fully migrated from Resend to Postmark for improved delivery reliability.
  - Integration: `POSTMARK_SERVER_TOKEN` configured as a Replit Secret.
  - Tracking: Enhanced server-side logging for confirmation and reminder emails.
- **App Store Links Updated**: Official BookFlowX app links implemented across all public pages.
- **Context4All AI System**: Implemented smart suggestions powered by OpenAI via Replit AI Integrations.
  - **Smart Upsell Suggestions**: Context-aware upsell recommendations based on service, time of day, customer type, and industry.
  - **Dynamic Messaging**: Industry-specific tone and messaging (professional, friendly, luxury, casual).
  - **Revenue Insights**: Explanations for revenue optimization based on booking patterns.
  - **API Endpoints**:
    - `POST /api/smart-suggestions/upsell` - Get AI-powered upsell suggestions
    - `POST /api/smart-suggestions/messaging` - Get dynamic messaging for industry
    - `POST /api/smart-suggestions/revenue-insight` - Get revenue insight explanations
  - **Client Hook**: `useSmartSuggestions` hook in `client/hooks/useSmartSuggestions.ts`
  - **Industries Supported**: auto_detailing, salon, fitness, medical, consulting, trades, wellness (7 verticals)
- **Google Calendar Two-Way Sync**: Full calendar integration using Replit's Google Calendar connector.
  - **OAuth**: Managed automatically by Replit's connector (no custom token storage needed)
  - **Free/Busy Check**: Voice agent queries Google Calendar before suggesting time slots
  - **Event Push**: Confirmed bookings automatically sync to Google Calendar
  - **Conflict Prevention**: Slots blocked by Google Calendar events are filtered out
  - **Implementation**: `server/googleCalendar.ts` with functions:
    - `isGoogleCalendarConnected()` - Check if connector is configured
    - `getGoogleBusyTimes(startDate, endDate)` - Fetch busy blocks
    - `filterSlotsWithGoogleBusy(slots, date, busyTimes, duration)` - Remove conflicting slots
    - `pushBookingToGoogleCalendar(booking)` - Create calendar event
    - `deleteGoogleCalendarEvent(eventId)` - Remove cancelled bookings
  - **Voice Flow**: BookFlow DB remains source of truth; Google Calendar acts as mirror + conflict detector
- **Voice Agent (Vapi.ai Streaming)**: Real-time streaming voice booking powered by Vapi.ai WebRTC.
  - **Architecture**: Vapi.ai Web SDK for low-latency streaming voice conversations
  - **Technology**: WebRTC-based bidirectional audio streaming (no file uploads)
  - **Shareable Voice Page**: `/voice/{businessSlug}` - Customers can book via streaming voice
  - **Tap-to-Talk**: Tap button to start/stop real-time conversation
  - **Vapi Assistant**: Pre-configured assistant (ID: `fbc1fe60-e500-4e20-9537-0fb1ade6cd56`)
  - **Environment Variables**:
    - `VAPI_PUBLIC_KEY` - Vapi public API key for web SDK
    - `VAPI_PRIVATE_KEY` - Vapi private key for server-side operations
    - `VAPI_ASSISTANT_ID` - Pre-configured booking assistant ID
  - **API Endpoints**:
    - `GET /voice/{slug}` - Serve Vapi-powered voice booking page
    - `GET /api/vapi/config/{slug}` - Get Vapi config for business
    - `POST /api/vapi/webhook` - Handle Vapi function calls (tools)
  - **Function Tools**: `list_services`, `get_available_slots`, `create_booking` - integrated with BookFlow backend
  - **Implementation Files**: `server/vapiRoutes.ts`, `server/templates/voice-agent-vapi.html`
  - **Booking Page Integration**: "Try Voice Booking" link added to booking page header
  - **Fallback**: Legacy file-based voice agent available via `?legacy=true` query param
- **Native Expo Voice Booking**: In-app voice booking with reliable iOS microphone access.
  - **Components**: `client/components/VoiceRecorder.tsx`, `client/screens/VoiceBookingScreen.tsx`
  - **Library**: `expo-av` for native audio recording (WAV format, 16kHz, mono)
  - **Push-to-Talk**: Hold mic button to record, release to send
  - **Permissions**: Native iOS/Android microphone permission handling
  - **Access**: Settings → Booking → Voice Booking card
  - **Navigation**: Modal screen via `RootStackNavigator`
  - **Benefits**: No WebView issues, reliable TestFlight/App Store compatibility, guaranteed microphone access
- **Voice Agent Subscription System**: Monetization for voice booking with tiered usage-based pricing.
  - **Subscription Tiers**:
    - Free Trial: 5 minutes (for testing)
    - Starter ($49/mo): 60 minutes
    - Pro ($149/mo): 200 minutes (recommended)
    - Business ($349/mo): 500 minutes
  - **Profit Margins**: ~75-95% (cost ~$0.12-0.15/min, pricing $0.70-0.82/min)
  - **Database Schema**: `voiceSubscriptions`, `voiceCallLogs` tables
  - **Call Tracking**: Automatic logging of call duration, customer info, booking conversions
  - **Usage Enforcement**: Blocks voice page when minutes exhausted, redirects to online booking
  - **Billing Architecture (Apple-Compliant)**:
    - **Layer 1 (In-App)**: RevenueCat + Apple App Store for iOS purchases
      - `client/lib/revenuecat.ts`: Voice entitlements (voice_starter, voice_pro, voice_business)
      - `client/components/VoiceAgentPaywall.tsx`: RevenueCat paywall with restore purchases
      - Entitlement verification via `getVoiceEntitlement()`
      - Platform-specific handling: Web users directed to App Store
    - **Layer 2 (Web - Future)**: Stripe for web-only billing portal (deferred)
  - **API Endpoints**:
    - `GET /api/businesses/:id/voice-subscription` - Get subscription status and usage
    - `GET /api/businesses/:id/voice-calls` - Get call history
    - `GET /api/voice-tiers` - Get available subscription tiers
  - **Client Hook**: `useVoiceSubscription` in `client/hooks/useVoiceSubscription.ts`
  - **RevenueCat Setup**: Entitlements: `voice_starter`, `voice_pro`, `voice_business`
  - **Settings UI**: Voice Agent Plan card showing tier, usage meter, calls, bookings, conversion rate

## AI Feature Messaging (Apple-Safe)
- Use: "Smart suggestions", "Automatically adapts", "Learns from patterns", "Helps reduce no-shows"
- Avoid: "Fully autonomous", "Runs your business for you", "AI decides", "Predicts behavior"

## App Clips (iOS)
BookFlow supports iOS App Clips for instant access without full app installation.

### Configuration
- **Library**: `react-native-app-clip` (v0.6.0+)
- **Bundle ID Suffix**: `Clip` (full: `com.bookflow.app.Clip`)
- **Deployment Target**: iOS 16.0 (allows 15MB App Clip size)
- **Entry Point**: `client/App.clip.tsx`

### Dual-Mode App Clip
The App Clip supports two modes based on deep link:
1. **Customer Mode** (default): Quick booking flow
   - URL: `https://book.confirmbooking.online/{businessSlug}`
   - Shows available services and time slots
2. **Owner Quick Mode**: Fast actions for business owners
   - URL: `https://book.confirmbooking.online/owner/{businessSlug}?token={ownerToken}`
   - View today's bookings (read-only)
   - Share booking link/QR code

### Building App Clips
App Clips require a development build (not Expo Go):
```bash
npx expo prebuild
npx expo run:ios --configuration Release --scheme Clip
```

### Apple Guidelines
- App Clips must be under 15MB (iOS 16+) or 10MB (iOS 15)
- Single-purpose, immediate actions only
- No complex dashboards or subscription management
- Always promote full app installation

## Premium Typography System
- **Headings**: Cormorant Garamond (Bold/Medium) - editorial, architectural feel
- **Body/Navigation**: Inter (Regular/SemiBold/Light) - modern, screen-optimized
- **Monospace**: JetBrains Mono - technical precision for IDs, currency
- **Letter Spacing**: -2px for oversized headings, +2px for uppercase captions
