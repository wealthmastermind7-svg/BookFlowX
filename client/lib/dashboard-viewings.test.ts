import assert from "node:assert/strict";
import { test } from "node:test";
import type { Booking } from "./api";
import { agencyClock, viewingOverview } from "./dashboard-viewings";

const booking = (updates: Partial<Booking>): Booking => ({
  id: "viewing", businessId: "agency", customerId: "client", serviceId: "type",
  date: "2026-10-02", time: "16:00", status: "confirmed", totalPrice: 0, ...updates,
});
test("uses the agency's date and greeting rather than UTC", () => {
  const clock = agencyClock(new Date("2026-10-01T22:00:00Z"), "Pacific/Auckland");
  assert.equal(clock.date, "2026-10-02");
  assert.equal(clock.greeting, "Good morning");
});
test("counts Monday through Sunday and excludes cancelled records", () => {
  const model = viewingOverview([
    booking({ date: "2026-09-28", channel: "sms" }),
    booking({ date: "2026-10-02", channel: "voice", status: "pending" }),
    booking({ date: "2026-10-04", channel: "email", status: "completed" }),
    booking({ date: "2026-10-05", channel: "chat" }),
    booking({ date: "2026-10-02", channel: "voice", status: "cancelled" }),
    booking({ date: "2026-10-02", channel: null }),
  ], new Date("2026-10-02T01:00:00Z"), "Pacific/Auckland");
  assert.equal(model.todayCount, 2);
  assert.equal(model.weekCount, 4);
  assert.deepEqual(model.weeklyData.map((day) => day.value), [1, 0, 0, 0, 2, 0, 1]);
  assert.deepEqual(model.channels.map((channel) => channel.count), [1, 1, 1, 1]);
  assert.equal(model.unrecordedCount, 1);
  assert.deepEqual(model.statuses, { confirmed: 3, pending: 1, completed: 1 });
  assert.equal(model.upcoming.length, 3);
});
test("empty weeks show zeros, not fabricated activity", () => {
  const model = viewingOverview([], new Date("2026-10-02T00:00:00Z"), "UTC");
  assert.equal(model.weekCount, 0);
  assert.ok(model.weeklyData.every((day) => day.value === 0));
});