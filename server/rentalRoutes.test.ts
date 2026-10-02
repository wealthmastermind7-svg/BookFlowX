import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import {
  insertRentalPropertySchema,
  insertInspectionReportSchema,
  inspectionRoomSchema,
  rentalPhotoSchema,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { createRentalRouter } from "./rentalRoutes";

const validPhoto = "data:image/jpeg;base64," + "A".repeat(400);

test("rental photos permit persistent image data and HTTPS, but reject ephemeral or oversized images", () => {
  assert.equal(rentalPhotoSchema.safeParse(validPhoto).success, true);
  assert.equal(rentalPhotoSchema.safeParse("https://example.com/listing.jpg").success, true);
  assert.equal(rentalPhotoSchema.safeParse("blob:https://example.com/photo").success, false);
  assert.equal(rentalPhotoSchema.safeParse("http://example.com/photo.jpg").success, false);
  const oversized = "data:image/jpeg;base64," + "A".repeat(4 * 1024 * 1024 + 4);
  assert.equal(rentalPhotoSchema.safeParse(oversized).success, false);
  assert.equal(insertRentalPropertySchema.safeParse({
    address: "100 Main St",
    photos: Array(7).fill("https://example.com/photo.jpg"),
  }).success, false);
});

test("inspection room validation enforces condition, maximum photos, and aligned ISO timestamps", () => {
  const validRoom = {
    id: "room-1",
    name: "Kitchen",
    condition: "good",
    notes: "",
    photos: [validPhoto],
    photoTimestamps: ["2026-04-01T10:00:00.000Z"],
  };
  assert.equal(inspectionRoomSchema.safeParse(validRoom).success, true);
  assert.equal(inspectionRoomSchema.safeParse({ ...validRoom, condition: "excellent" }).success, false);
  const { condition: _condition, ...missingCondition } = validRoom;
  assert.equal(inspectionRoomSchema.safeParse(missingCondition).success, false);
  assert.equal(inspectionRoomSchema.safeParse({ ...validRoom, photoTimestamps: [] }).success, false);
  assert.equal(inspectionRoomSchema.safeParse({
    ...validRoom,
    photoTimestamps: ["not-a-date"],
  }).success, false);
  assert.equal(inspectionRoomSchema.safeParse({
    ...validRoom,
    photos: Array(21).fill(validPhoto),
    photoTimestamps: Array(21).fill("2026-04-01T10:00:00.000Z"),
  }).success, false);
});

test("rental and inspection dates require valid ISO calendar dates while optional rental dates may be empty", () => {
  const property = { address: "100 Main St", moveInDate: "", leaseEndDate: "2024-02-29" };
  assert.equal(insertRentalPropertySchema.safeParse(property).success, true);
  assert.equal(insertRentalPropertySchema.safeParse({ ...property, moveInDate: "2025-02-29" }).success, false);
  assert.equal(insertRentalPropertySchema.safeParse({ address: "100 Main St", leaseEndDate: "2026-13-01" }).success, false);
  const room = {
    id: "room-1",
    name: "Kitchen",
    condition: "good",
    notes: "",
    photos: [],
    photoTimestamps: [],
  };
  const report = { type: "routine", date: "2024-02-29", rooms: [room] };
  assert.equal(insertInspectionReportSchema.safeParse(report).success, true);
  assert.equal(insertInspectionReportSchema.safeParse({ ...report, date: "2026-02-29" }).success, false);
  assert.equal(insertInspectionReportSchema.safeParse({ ...report, date: "04/01/2026" }).success, false);
  assert.equal(insertInspectionReportSchema.safeParse({ ...report, photos: [] }).success, false);
});

test("rental endpoints authorize by tenant and reject attempted ownership reassignment", async () => {
  const property = {
    id: "property-a",
    businessId: "business-a",
    name: "Unit 1",
    address: "100 Main St",
    unit: null,
    tenantName: null,
    tenantEmail: null,
    tenantPhone: null,
    notes: null,
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const mockStorage = {
    getBusinessByToken: async (token: string) => token === "token-a"
      ? { id: "business-a" }
      : token === "token-b" ? { id: "business-b" } : undefined,
    getRentalProperties: async () => [property],
    getRentalProperty: async () => property,
    createRentalProperty: async (input: unknown) => input,
    updateRentalProperty: async (_id: string, updates: unknown) => ({ ...property, ...updates }),
    getInspectionReports: async () => [],
    getInspectionReport: async () => undefined,
    createInspectionReport: async (input: unknown) => input,
    updateInspectionReport: async () => undefined,
  } as unknown as IStorage;

  const app = express();
  app.use(express.json());
  app.use("/api", createRentalRouter(mockStorage));
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const crossTenant = await fetch(`${baseUrl}/rentals/property-a`, {
      headers: { "x-business-token": "token-b" },
    });
    assert.equal(crossTenant.status, 403);

    const attemptedReassignment = await fetch(`${baseUrl}/rentals/property-a`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-owner-token": "token-a",
      },
      body: JSON.stringify({ businessId: "business-b", address: "200 Main St" }),
    });
    assert.equal(attemptedReassignment.status, 200);
    const updated = await attemptedReassignment.json() as { businessId: string; address: string };
    assert.equal(updated.businessId, "business-a");
    assert.equal(updated.address, "200 Main St");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});