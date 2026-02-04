# BookFlow - Multi-Tenancy Booking Platform MVP

## Overview
BookFlow is a scalable multi-tenant booking platform designed for businesses, offering a public booking experience for customers and a comprehensive admin dashboard for owners. The project aims to provide an app-store-ready solution for appointment and service management across various business verticals, focusing on a premium user experience with sophisticated design, oversized typography, and cinematic animations. BookFlow seeks to capitalize on the growing demand for efficient online booking solutions, empowering businesses with advanced tools for customer engagement and operational management.

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

### UI/UX Decisions
- **Color Palette**: Premium black & white (`Pure Black`, `Charcoal`, `Graphite`, `Smoke`, `Silver`, `Pearl`).
- **Typography**: Oversized hierarchy (`Display 72-96px`, `H1 48-56px`, `Body 18-24px`), using Cormorant Garamond for headings and Inter for body/navigation.
- **Animation**: Spring physics with cinematic transitions (400ms ease-out).
- **Components**: Custom Circular Meters, Animated Cards, Line Graphs with Bezier curves.
- **Haptic Feedback**: Comprehensive haptic feedback (Light, Medium, Heavy) on all interactive elements.

### Technical Implementations
- **Frontend**: React Native (Expo) for cross-platform mobile and web, featuring a 5-tab admin dashboard and public booking flow.
- **Backend**: Express.js server providing a multi-tenant REST API.
- **Database**: PostgreSQL with Drizzle ORM, employing a multi-tenant schema for core entities.
- **Navigation**: `MainTabNavigator` for admin and `BookingFlowNavigator` for public access.
- **Features**: Dashboard analytics, CRUD for services and customers, a 4-screen public booking flow, QR code generation, and an embeddable booking widget.
- **AI Integrations**: Smart suggestions for upsells and dynamic messaging via OpenAI, Google Calendar two-way sync, and a Vapi.ai streaming voice agent for booking.
- **Voice Agent**: Supports real-time streaming voice booking via Vapi.ai with shareable pages and in-app native Expo voice recording. Includes a tiered subscription system for monetization with RevenueCat integration for iOS.
- **App Clips (iOS)**: Supports iOS App Clips for quick customer booking or owner actions, with dual modes based on deep links.

### System Design Choices
- **Multi-Tenancy**: Implemented at both API and database levels for robust data isolation.
- **API Connectivity**: Dynamic environment detection for API URLs.
- **Error Handling**: Client-side retry logic and server-side validation.
- **Security**: Token-based ownership verification (`ownerToken`) for admin routes to ensure data isolation.

## External Dependencies
- **React Native (Expo)**: Frontend development framework.
- **Express.js**: Backend web application framework.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **RevenueCat**: In-app purchase and subscription management (for voice agent monetization).
- **Postmark**: Email service for transactional emails like booking confirmations.
- **Vapi.ai**: AI voice agent platform for streaming voice interactions.
- **OpenAI**: Provides AI capabilities for smart suggestions and dynamic messaging.
- **Google Calendar API**: For two-way synchronization of business calendars.
- **expo-av**: For native audio recording in React Native.
- **react-native-app-clip**: For implementing iOS App Clips.