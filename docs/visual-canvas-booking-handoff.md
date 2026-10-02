# Visual Canvas customer-link handoff

## Scope

BookFlowX now generates business links and QR codes for:

`https://elegant-canvas--wealthmastermin.replit.app/book/{slug}`

The customer project is separate: `842e64e6-600c-4f25-af38-479ae3bbcebb`. Its source cannot be edited from this BookFlowX workspace.

## Routing and agency filtering needed in Visual Canvas

- Inspect the real App entry point, web navigation/router, DiscoverScreen, and existing data loader before editing.
- On browser entry, read the decoded business slug from `/book/:slug`; also accept `?business=slug`. The path slug takes precedence. Read the first business path segment even when an optional service segment follows.
- Pass the slug through the existing navigation/props to DiscoverScreen. Resolve the actual business by slug using the existing API and filter its bookable viewings by that business's identity.
- Without a slug, retain normal discovery of all businesses.
- For an unknown business, failed lookup, or no available viewings, show the appropriate explicit state. Do not silently fall back to displaying another business.
- Preserve current customer UI, animations, viewing selection, booking flow, and payment behavior.
- Make direct navigation and refresh at `/book/:slug` load the customer web app, not a legacy HTML booking template.
- Verify a shared link and decoded QR land on only the requested business, then verify the unscoped root still discovers all businesses.

## Deployment/domain check

Read-only inspection found that the proposed hostname currently serves legacy `Book Appointment` HTML at `/book/royal-t2fp`. BookFlowX's deployment metadata also lists this hostname among its additional URLs. Verify the actual customer deployment and domain assignment in Visual Canvas before claiming the two apps are linked. Do not move a domain or publish without the user's confirmation.

BookFlowX's verified primary production URL at the time of this handoff is `https://bookflowx.cerolauto.store`. The customer link origin and BookFlowX API origin are separate concerns; do not point owner API traffic at the customer UI merely to change sharing links.

After verifying the destination and publishing the customer changes, republish the BookFlowX changes as well so its live API-generated QR payloads use the new destination. Existing printed QR codes retain their original encoded URL; this change updates newly generated codes.