# BookFlow - Multi-Tenancy Booking Platform MVP

## Overview
BookFlow is a scalable multi-tenant booking platform designed for businesses, offering a public booking experience for customers and a comprehensive admin dashboard for owners. The project aims to provide an app-store-ready solution for appointment and service management across various business verticals, focusing on a premium user experience with sophisticated design, oversized typography, and cinematic animations. BookFlow seeks to capitalize on the growing demand for efficient online booking solutions, empowering businesses with advanced tools for customer engagement and operational management.

## User Preferences
- **Communication Style**: I prefer clear, concise, and direct communication.
- **Explanation Style**: Provide detailed explanations for complex concepts or decisions.
- **Workflow**: I prefer an iterative development approach.
- **Interaction**: Ask before making major architectural changes or introducing new dependencies.
- **Codebase Changes**:
    - Keep the bold dark navy/black, electric cyan, and violet premium color scheme across the website and owner app.
    - Prioritize robust error handling and graceful fallbacks.
    - Ensure new features integrate seamlessly with existing haptic feedback patterns.
    - When updating dependencies, prioritize stability and production readiness.

## System Architecture

### UI/UX Decisions
- **Color Palette**: Deep navy/near-black (`#0a0a0f`, `#0d0d1a`, `#111827`), electric cyan (`#00d4ff`) and violet (`#7c3aed`), with white headings, slate body text, and dark cards with subtle accent borders.
- **Typography**: Bold, modern Inter headings and body copy, with oversized display headlines and occasional cyan/violet gradient text.
- **Animation**: Spring physics with cinematic transitions (400ms ease-out).
- **Components**: Custom Circular Meters, Animated Cards, Line Graphs with Bezier curves.
- **Haptic Feedback**: Comprehensive haptic feedback (Light, Medium, Heavy) on all interactive elements.

### Technical Implementations
- **Frontend**: React Native (Expo) for cross-platform mobile and web, featuring a 5-tab admin dashboard and public booking flow.
- **Backend**: Express.js server providing a multi-tenant REST API.
- **Database**: PostgreSQL with Drizzle ORM, employing a multi-tenant schema for core entities.
- **Navigation**: `MainTabNavigator` for admin and `BookingFlowNavigator` for public access.
- **Features**: Dashboard analytics, CRUD for services and customers, a 4-screen public booking flow, QR code generation, and an embeddable booking widget.
- **AI Integrations**: Smart suggestions for upsells and dynamic messaging via OpenAI, Google Calendar two-way sync, and a Vapi.ai streaming voice agent for booking. Kimi K2.5 (Moonshot AI) powers business intelligence features (morning briefing, scheduling insights, competitor radar, re-engagement, review responses, email management) and voice agent reasoning.
- **Voice Agent**: Supports real-time streaming voice booking via Vapi.ai with shareable pages and in-app native Expo voice recording. Voice agent reasoning powered by Kimi K2.5 for cost savings. Includes a tiered subscription system for monetization with RevenueCat integration for iOS.
- **Kimi Claw Outreach**: Automated daily outreach system (`server/outreachCron.ts`) using Kimi K2.5 agent capabilities to prospect 20 Gmail-based appointment service businesses daily, then send premium outreach emails via Postmark. Runs as a cron job at 9am. Admin UI at `/internal/outreach` (Kimi Claw tab). Rotates through 10 niches × 30 cities.
- **App Clips (iOS)**: Supports iOS App Clips for quick customer booking or owner actions, with dual modes based on deep links.

### System Design Choices
- **Multi-Tenancy**: Implemented at both API and database levels for robust data isolation.
- **API Connectivity**: Dynamic environment detection for API URLs.
- **Error Handling**: Client-side retry logic and server-side validation.
- **Security**: Token-based ownership verification (`ownerToken`) for admin routes to ensure data isolation.

### Programmatic SEO System
- **File**: `server/seo-routes.ts` - All SEO routes registered via `registerSeoRoutes(app)` in `server/index.ts`
- **Domain**: confirmbooking.online (brand: "ConfirmBooking")
- **Routes**:
  - `/seo` - SEO homepage with hero, features, social proof
  - `/booking-software` - Industry directory (20 industries)
  - `/booking-software/:industry` - Industry page with 51 city links
  - `/booking-software/:industry/:location` - 1,020 programmatic pages (20 × 51)
  - `/compare` - Competitor comparisons directory
  - `/compare/:competitor` - 10 comparison pages (Calendly, Acuity, Vagaro, Mindbody, etc.)
  - `/tools` - Free tools directory
  - `/tools/no-show-calculator` - Interactive No-Show Cost Calculator
  - `/sitemap.xml` - Full sitemap (1,055 URLs)
  - `/robots.txt` - Crawler instructions
- **SEO Features**: Meta tags, Open Graph, JSON-LD structured data, breadcrumbs, UTM tracking on all CTAs
- **Design**: Dark navy theme matching the app aesthetic (Inter, cyan/violet accents, Tailwind CDN)
- **Branding Rule**: Use "Voice Assistant" or "Informational Assistant" only — NO "AI" or "Voice Booking"

## External Dependencies
- **React Native (Expo)**: Frontend development framework.
- **Express.js**: Backend web application framework.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **RevenueCat**: In-app purchase and subscription management (for voice agent monetization).
- **Postmark**: Email service for transactional and outreach emails.
- **Vapi.ai**: AI voice agent platform for streaming voice interactions.
- **Moonshot AI (Kimi K2.5)**: Business intelligence, voice agent reasoning, and automated lead prospecting.
- **OpenAI**: Provides AI capabilities for smart suggestions, TTS, and STT.
- **Google Calendar API**: For two-way synchronization of business calendars.
- **expo-av**: For native audio recording in React Native.
- **react-native-app-clip**: For implementing iOS App Clips.