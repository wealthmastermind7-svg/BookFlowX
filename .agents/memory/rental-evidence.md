---
name: Rental inspection evidence
description: Purpose and persistence rules for landlord inspection evidence.
---

BookFlowX rental management is for landlords to take photos before new tenants move in and during inspections, and save them as evidence for the end of tenancy.

**Why:** The user explicitly described this product purpose when requesting rentals alongside listing photos.

**How to apply:** Preserve the move-in baseline, room-level conditions and timestamped photos through routine and move-out inspections. Treat these as user evidence, not disposable preview media.

Do not fabricate condition ratings to make a draft valid. Save incomplete drafts locally and explain why they cannot sync or complete yet. Distinguish a timestamp added by the app from a verified camera/EXIF capture timestamp.

**Why:** The shared record contract requires ratings, but landlords need to save unfinished inspections; false defaults or misleading timestamps weaken the evidence.

**How to apply:** Keep local draft and completed/syncable report validation separate. Local save failures must be explicit and must not silently erase previous evidence.

Large photo sets and generated PDFs need storage that supports large records, with serialized read-modify-write operations.

**Why:** Base64 evidence can exceed browser localStorage or Android AsyncStorage row limits, and parallel cache writes otherwise lose records.

**How to apply:** Do not regress evidence persistence to single oversized AsyncStorage values. Preserve previous content until a new write is committed, and test concurrent updates.