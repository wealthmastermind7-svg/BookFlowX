---
name: HTML-only restyling contract
description: Preserving inline booking behavior during strict HTML/CSS-only theme replacements.
---

For a redesign that explicitly requires unchanged JavaScript, preserve the inline scripts exactly and maintain the DOM IDs, element types, state classes, and CSS variables referenced by dynamically generated markup.

**Why:** Booking templates generate services, slots, and add-ons from inline JavaScript; static HTML styling alone does not cover those dependencies. Simply appending a new palette can leave legacy styles active on hidden screens.

**How to apply:** Snapshot the script before editing and compare it afterward. Consolidate the stylesheet rather than layering another theme over it. Keep required legacy variable names as semantic aliases with the new colors, and verify hidden steps as well as the initial page. Handle script-controlled legacy button copy through accessible HTML/CSS when script changes are out of scope.

Selected booking controls must retain readable foreground/background pairs while hovered, including hover that persists after a mobile tap.

**Why:** A mobile-sized browser check found a hover selector overriding a selected time slot's amber background while leaving its white label, making the selected time nearly invisible.

**How to apply:** Exclude selected controls from unselected hover rules, and inspect the selected state after an actual click or tap rather than only assigning its class.