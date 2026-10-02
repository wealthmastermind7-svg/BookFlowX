// Customer booking links are independent of the owner app's API origin.
export const CUSTOMER_BOOKING_DOMAIN = "elegant-canvas--wealthmastermin.replit.app";
export const CUSTOMER_BOOKING_ORIGIN = `https://${CUSTOMER_BOOKING_DOMAIN}`;

export function getCustomerBookingUrl(slug: string, serviceSlug?: string): string {
  const businessPath = `${CUSTOMER_BOOKING_ORIGIN}/book/${encodeURIComponent(slug)}`;
  return serviceSlug ? `${businessPath}/${encodeURIComponent(serviceSlug)}` : businessPath;
}