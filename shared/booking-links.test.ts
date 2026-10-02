import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOMER_BOOKING_DOMAIN, getCustomerBookingUrl } from "./booking-links";

test("business share links use Visual Canvas with the original agency slug", () => {
  assert.equal(CUSTOMER_BOOKING_DOMAIN, "elegant-canvas--wealthmastermin.replit.app");
  assert.equal(getCustomerBookingUrl("royal-t2fp"), "https://elegant-canvas--wealthmastermin.replit.app/book/royal-t2fp");
});

test("service links preserve their specific service path on Visual Canvas", () => {
  assert.equal(getCustomerBookingUrl("royal-t2fp", "property-viewing"), "https://elegant-canvas--wealthmastermin.replit.app/book/royal-t2fp/property-viewing");
});

test("slug segments cannot change the destination or inject a query", () => {
  assert.equal(getCustomerBookingUrl("agency/name?x=1", "viewing #1"), "https://elegant-canvas--wealthmastermin.replit.app/book/agency%2Fname%3Fx%3D1/viewing%20%231");
});