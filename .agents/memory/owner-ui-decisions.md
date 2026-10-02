---
name: Owner navigation and booking links
description: User-selected navigation scope and the distinction between short-link presentation and live booking destinations.
---

The owner app should keep exactly five bottom tabs: Home, Calendar, New, Clients, Settings. New is the quick-add action. AI Assistant has its own screen reached from Settings rather than a sixth bottom tab. Viewing-type management remains available from Settings.

**Why:** The user resolved the conflict between five bottom tabs and a dedicated Assistant tab by choosing five tabs with Assistant in Settings.

**How to apply:** Preserve this navigation scope during future owner-app changes unless the user explicitly changes it.

Cosmetic branded domains on preview cards are placeholders unless a working alias is configured. They must not replace the configured customer booking destination in QR codes or copy/open/share actions.

**Why:** The user permits a clean branded-domain placeholder in the preview, while requiring actual shared links and QR codes to open the customer viewing app.

**How to apply:** Keep preview branding separate from the actual destination. During a destination change, ensure link text, copying, sharing, and QR payloads agree without changing the owner API host.

Business sharing links and QR codes should open the separate customer viewing app scoped to that business. Customer discovery without a business slug should continue to show all businesses.

**Why:** The user explained that the owner and customer sides were not linked and requested agency-scoped customer discovery instead of the legacy booking design.

**How to apply:** Keep customer-facing link destinations separate from the owner API origin; verify both destination routing and business filtering when changing customer links.

Booking success and notification delivery are separate outcomes. Confirmation screens must not claim an email or SMS was sent merely because a booking was saved.

**Why:** Browser verification found a successful booking screen claiming email delivery while the persisted viewing still showed confirmation pending.

**How to apply:** Use neutral booking-success copy until actual delivery evidence is available; never infer separate channel receipts from an overall workflow status.

Customer email confirmations should be attempted immediately after a booking is saved, independently of whether the business has enabled a confirmation workflow.

**Why:** The user explicitly requested: "email confirmations should be activated — customer email confirmations should be immediate."

**How to apply:** Keep immediate delivery independent of workflow configuration. Workflows must check for prior confirmation before sending, reminders must remain separate, and failed or deliberately blocked sends must not be recorded as delivered.