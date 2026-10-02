---
name: Expo preview routing
description: Replit's special Expo web preview is not the Express API origin.
---

Replit's special Expo web preview host serves Metro, not Express. Same-origin /api requests need development middleware forwarding to the backend; a rendered owner screen alone does not establish that its API connection works.

**Why:** The UI rendered correctly while business creation and other API requests returned Metro HTML/404 responses instead of JSON.

**How to apply:** When debugging preview connectivity, check response content type and backend handling from the actual Expo preview origin. Preserve native/published API resolution when changing development forwarding.