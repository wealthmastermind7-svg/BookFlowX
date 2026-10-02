---
name: Stripe credential scoping
description: Why the app retains Replit's environment-scoped Stripe connection instead of shared Secret overrides.
---

Keep the app's Stripe credentials managed by its Replit connection, with separate development and production credentials. Do not override a working connection with shared Stripe Secrets unless the user explicitly requests a credential-source migration.

**Why:** A shared Secret override replaced working connector credentials with an invalid key identifier and broke Stripe API authentication. The development connection was healthy while the production credential lookup was separately missing, so successful development initialization did not prove live readiness.

**How to apply:** Verify the production credential path separately before claiming live Stripe is ready. Complete live credential setup through the publishing Stripe configuration. Never log credential values or mix credentials from different sources.