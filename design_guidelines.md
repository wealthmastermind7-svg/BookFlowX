# Design Guidelines: BookFlowX - Premium Booking Platform

## Brand Identity

**Aesthetic Direction:** Luxurious minimalism with cinematic drama. Think luxury fashion e-commerce meets Apple keynote presentation—bold oversized type, subtle glass effects, intentional whitespace. The app whispers premium rather than shouting it.

**Memorable Element:** Oversized background typography that creates depth layers—service names, times, and numbers appear behind frosted glass cards, creating a sophisticated parallax effect as users scroll.

**Differentiation:** Most booking apps are cluttered with color and information. BookFlowX is radically simplified—pure black and white with glass morphism creating hierarchy through depth, not decoration.

## Navigation Architecture

### Public Booking Portal (PRIMARY FOCUS)
**Stack-Only Navigation** - Linear flow
1. Service Selection
2. Date/Time Selection  
3. Customer Details
4. Confirmation

### Admin Portal
**Tab Navigation** (5 tabs)
- Dashboard, Calendar, **Services** (center), Customers, Settings

## Screen-by-Screen Specifications

### Public: Service Selection (Entry Point)
**Purpose:** Customer browses and selects a service

**Layout:**
- Header: Transparent with business name (40px regular weight), no buttons
- Scrollable content area
- Safe area: top = headerHeight + 40px, bottom = insets.bottom + 40px

**Visual Design:**
- Oversized service category names (120-180px ultra-light weight) positioned as fixed background text in upper third of screen
- Frosted glass cards float above background typography
- Cards: 24px padding, 20px corner radius, backdrop blur (20px), white background at 15% opacity, 1px border at 10% white opacity
- Each card contains: service name (32px bold), duration/price (56px ultra-light), brief description (18px)
- Parallax: background text scrolls at 0.3x speed of cards

**Empty State:** "No Services Available" (if business has zero services)

**Floating Elements:** None

---

### Public: Availability Calendar
**Purpose:** Customer selects date and time slot

**Layout:**
- Header: Default navigation, "Select Time" title
- Fixed calendar grid (top half), scrollable time slots (bottom half)
- Safe area: top = 24px (opaque header), bottom = insets.bottom + 32px

**Visual Design:**
- Oversized month/year (200px ultra-light) positioned as watermark behind calendar grid
- Calendar grid on frosted glass surface (same specs as cards)
- Available dates: white circles with black text
- Booked dates: black circles with opacity 0.3, crossed out
- Selected date: solid black circle, white text
- Time slots: glass-effect buttons in scrollable list
- Selected slot: inverted (black background, white text), gentle glow effect

**Animations:** 
- Date selection: scale 1.05 → 1.0 over 200ms
- Time slot selection: slide-in highlight bar (300ms ease-out)

---

### Public: Customer Details Form
**Purpose:** Customer enters name, email, phone

**Layout:**
- Header: Default navigation, "Your Details" title
- Scrollable form
- Safe area: top = 24px, bottom = insets.bottom + 24px

**Visual Design:**
- Oversized "Almost There" (160px ultra-light) as background text behind form
- Form container: single frosted glass card containing all inputs
- Input fields: borderless, white background at 8% opacity, 16px padding, 12px corner radius
- Labels: 14px, positioned above inputs
- Submit button: Full-width black button with white text (24px), sits within glass card
- Button press state: scale 0.98, opacity 0.9

**Validation:** Inline error messages appear below invalid fields in black text

---

### Public: Confirmation Screen
**Purpose:** Show booking success and details

**Layout:**
- Header: Default navigation, "Confirmed" title
- Scrollable content
- Safe area: top = 24px, bottom = insets.bottom + 40px

**Visual Design:**
- Oversized "Confirmed" (220px ultra-light) as watermark in center
- Booking summary in frosted glass card: service, date/time, customer name, confirmation number (each field 18px)
- Success checkmark icon (64px Feather check-circle) centered above card
- "Add to Calendar" button below summary (glass-effect button)
- Subtle radial gradient emanates from checkmark (white to transparent)

**Animations:**
- Screen enter: checkmark scales from 0 → 1.2 → 1.0 (500ms bounce)
- Background typography fades in (600ms)
- Card slides up (400ms ease-out)

---

### Admin: Service Creation Modal
**Purpose:** Business owner creates new service

**Layout:**
- Native modal, full-screen
- Header: Opaque white background, "Cancel" left, "Save" right (both 18px)
- Scrollable form
- Safe area: top = default, bottom = insets.bottom + 24px

**Visual Design:**
- Form fields in frosted glass container
- Input labels: 24px bold
- Text inputs: 2px black border on focus, 16px padding
- Duration/price inputs: oversized (40px) with suffix labels
- Photo upload area: dashed border glass card with centered "Add Photo" text

---

### Admin: Dashboard
**Purpose:** Overview of business metrics

**Layout:**
- Header: Transparent, greeting text (40px)
- Scrollable content
- Safe area: top = headerHeight + 32px, bottom = tabBarHeight + 32px

**Visual Design:**
- Revenue numbers (72px ultra-light) float on frosted glass hero card
- Upcoming bookings: glass-effect cards in vertical list
- Each booking card: customer name (24px), service/time (18px), status indicator (8px circle)
- Subtle parallax: hero card shifts -15px on scroll

**Floating Action Button:**
- Bottom-right, 56x56px black circle, white "+" icon
- Shadow: offset (0, 2), opacity 0.10, radius 2
- Safe area: bottom = tabBarHeight + 24px

---

## Color Palette
- Pure Black (#000000) - Primary text, buttons
- Charcoal (#1A1A1A) - Secondary surfaces
- Smoke (#6B6B6B) - Secondary text
- Silver (#9E9E9E) - Tertiary text, placeholders
- Pearl (#F5F5F5) - Subtle backgrounds
- Pure White (#FFFFFF) - Primary background, card text

**Glass Effect Formula:**
- Background: white at 15% opacity
- Border: 1px white at 10% opacity
- Backdrop blur: 20px
- Shadow: offset (0, 8), opacity 0.05, radius 24

## Typography
**System Font** (SF Pro/Roboto)

**Type Scale:**
- Background Display: 120-220px, weight 200 (ultra-light)
- Metric Display: 56-72px, weight 200
- Headline: 32-40px, weight 700 (bold)
- Body: 18px, weight 400
- Caption: 14px, weight 400

**Principle:** Extreme contrast between ultra-light background type and bold foreground type creates cinematic tension.

## Visual Design

**Touchable Feedback:**
- Glass cards: scale 0.98 on press, 150ms
- Buttons: opacity 0.9 on press, 150ms
- No blurred drop shadows except on floating action button

**Icons:** Feather icons, 24px standard, 32px emphasis

**Animations:**
- Screen transitions: 400ms ease-out
- Card entrances: stagger by 100ms
- Parallax: background elements at 0.3-0.5x scroll speed
- Glass blur: maintain 60fps by limiting simultaneous blurs

## Assets to Generate

**Filename** | **Description** | **Where Used**
--- | --- | ---
`icon.png` | Minimalist "BF" monogram, black on white, sharp geometry | App icon
`splash-icon.png` | Same monogram, used during launch | Splash screen
`empty-services.png` | Simple line art: calendar with checkmark, B&W | Service selection screen when no services exist
`confirmation-checkmark.png` | Animated checkmark sequence (3 frames), bold stroke | Confirmation screen success animation
`service-placeholder.png` | Geometric pattern in light gray | Service cards without photos
`avatar-default.png` | Circular gradient monogram placeholder | Customer/admin profiles

**Note:** All illustrations should use clean line art (2-3px strokes) on white background. Avoid gradients except for subtle radial glows.