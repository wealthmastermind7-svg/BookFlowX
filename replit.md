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
- Fixed legal pages (privacy-policy, terms) with inline fallback HTML for production reliability
- Updated Resend sender email from `onboarding@resend.dev` to `bookings@confirmbooking.online`
- Added comprehensive logging for email debugging (`[Resend]` and `[Booking]` prefixes)
- Added test email endpoint for debugging Resend integration
- **Multi-Currency Support**: Added support for 75+ world currencies in `client/lib/currency.ts`
  - Currencies include proper symbols, formatting rules, and decimal separators
  - Currency selection available in Settings screen
  - Dashboard, Services, and Quick Sale screens now display prices in business currency
  - Known limitation: Prices are stored assuming 2 decimal places; currencies with 0 or 3 decimal places (JPY, KWD) may display incorrectly
- **Blocked Time Slots**: Added ability to block specific time slots on specific dates
  - New `blocked_slots` table in database schema
  - Protected API endpoints for blocking/unblocking slots
  - New "Block Times" button in Calendar screen that opens BlockedSlotsScreen
  - Blocked slots are excluded from public booking availability
  - Visual feedback for blocked vs available vs booked slots
- **Email Progress Tracking**: Dashboard now shows green progress ticks for booking email status
  - New columns on `bookings` table: `confirmationSentAt`, `reminder24hSentAt`, `reminder2hSentAt`
  - Workflow engine automatically marks timestamps when emails are sent
  - BookingCard displays "Booked", "Reminded", "Ready" indicators with green check marks
  - Bucket-based tracking: confirmation (delay=0), early reminders (12h+), final reminders (<12h)
- **Contractor Support**: Added comprehensive support for contractor and trade businesses
  - New industry templates: Contractor, Plumber, Electrician, HVAC, Cleaning, Landscaping
  - Contractor-specific workflow blueprints with visit-focused language
  - Demo data for each contractor type with realistic services and pricing
  - All 14 business types now available in Settings demo data selector
- **Manual Payment Confirmation**: Tap-to-confirm bookings on Dashboard and Calendar
  - Pending bookings can be tapped to mark as Confirmed (payment received)
  - Revenue metrics: Confirmed/Completed = Paid, Pending = Unpaid
  - Haptic feedback on confirmation actions