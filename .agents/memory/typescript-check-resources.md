---
name: TypeScript check resources
description: Avoid compiler stalls caused by the Google API declaration graph and limited Node heap.
---

If the full TypeScript check stalls without diagnostics, check compiler resources before weakening types or changing runtime imports. A temporary 4 GB Node heap and pausing the development preview allowed the unchanged strict check to complete.

**Why:** The default Node heap was about 2 GB. Repeated checks stalled while binding the Google API SDK declarations; a compiler trace identified that phase, and the larger-heap check completed successfully.

**How to apply:** Run `NODE_OPTIONS=--max-old-space-size=4096 npm run check:types` when needed. If resources are tight, temporarily stop the managed preview and restart it after validation. Keep strict checking enabled; do not skip source files or replace correct types with `any` to make the check finish.