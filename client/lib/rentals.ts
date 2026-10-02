import { evidenceStore } from "@/lib/evidence-store";
import { Platform } from "react-native";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";

export type RentalStatus = "active" | "vacant" | "inspection_due";
export type InspectionType = "move_in" | "routine" | "move_out";
export type Condition = "good" | "fair" | "poor";
export type InspectionRoomDraft = Omit<InspectionRoom, "condition"> & { condition?: Condition };
export type InspectionReportDraft = Omit<InspectionReport, "rooms"> & { rooms: InspectionRoomDraft[]; syncAttempted?: boolean; scheduleAttempted?: boolean; savedAt?: string };
export type RentalProperty = {
  id: string; businessId: string; address: string; photos: string[];
  tenantName?: string; tenantEmail?: string; tenantPhone?: string;
  moveInDate?: string; leaseEndDate?: string; status: RentalStatus; notes?: string; createdAt: string;
};
export type InspectionRoom = { id: string; name: string; photos: string[]; photoTimestamps: string[]; notes: string; condition: Condition };
export type InspectionReport = {
  id: string; propertyId: string; businessId: string; type: InspectionType; date: string;
  rooms: InspectionRoom[]; status: "draft" | "complete"; createdAt: string;
};
export type SavedDocument = { id: string; businessId: string; propertyId: string; reportId: string; uri: string; title: string; createdAt: string };
export const RENTAL_DRAFTS_KEY = "bookflow_rental_inspection_drafts_v1";
export const RENTAL_DOCS_KEY = "bookflow_rental_documents_v1";
const RENTAL_PROPERTY_CACHE = "bookflow_rental_property_cache_v1";
export const ROOM_DEFAULTS = ["Entrance", "Living Room", "Kitchen", "Bedroom 1", "Bathroom", "Exterior"];
export const emptyRoom = (name: string): InspectionRoomDraft => ({ id: `${Date.now()}-${Math.random()}`, name, photos: [], photoTimestamps: [], notes: "" });

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
  const token = await api.getOwnerToken();
  const response = await fetch(new URL(path, getApiUrl()).toString(), {
    method, credentials: "include",
    headers: { ...(data ? { "Content-Type": "application/json" } : {}), "x-owner-token": token || "" },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const rentalApi = {
  list: (businessId: string) => request<RentalProperty[]>("GET", `/api/businesses/${businessId}/rentals`),
  create: (businessId: string, data: Partial<RentalProperty>) => request<RentalProperty>("POST", `/api/businesses/${businessId}/rentals`, data),
  property: (id: string) => request<RentalProperty>("GET", `/api/rentals/${id}`),
  updateProperty: (id: string, data: Partial<RentalProperty>) => request<RentalProperty>("PUT", `/api/rentals/${id}`, data),
  inspections: (id: string) => request<InspectionReport[]>("GET", `/api/rentals/${id}/inspections`),
  createInspection: (id: string, data: Partial<InspectionReport>) => request<InspectionReport>("POST", `/api/rentals/${id}/inspections`, data),
  updateInspection: (id: string, data: Partial<InspectionReport>) => request<InspectionReport>("PUT", `/api/inspections/${id}`, data),
};
function parseStoredArray<T>(raw: string | null, label: string): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected a list");
    if (parsed.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry) || typeof (entry as { id?: unknown }).id !== "string")) {
      throw new Error("One or more saved records are incomplete");
    }
    if (label === "Inspection drafts" && parsed.some((entry) => {
      const item = entry as Partial<InspectionReportDraft>;
      return typeof item.businessId !== "string" || typeof item.propertyId !== "string" || !Array.isArray(item.rooms) || !isISODate(item.date);
    })) throw new Error("An inspection draft is missing required local fields");
    if (label === "Rental property cache" && parsed.some((entry) => {
      const item = entry as Partial<RentalProperty>;
      return typeof item.businessId !== "string" || typeof item.address !== "string";
    })) throw new Error("A cached rental is missing its business or address");
    if (label === "Rental documents" && parsed.some((entry) => {
      const item = entry as Partial<SavedDocument>;
      return typeof item.propertyId !== "string" || typeof item.reportId !== "string" || typeof item.uri !== "string" || typeof item.title !== "string";
    })) throw new Error("A saved document is missing required metadata");
    return parsed as T[];
  } catch (error) {
    throw new Error(`${label} could not be read safely. Existing local evidence was left untouched. ${error instanceof Error ? error.message : ""}`.trim());
  }
}
export async function getDrafts(businessId?: string): Promise<InspectionReportDraft[]> {
  const drafts = parseStoredArray<InspectionReportDraft>(await evidenceStore.getItem(RENTAL_DRAFTS_KEY), "Inspection drafts");
  return businessId ? drafts.filter((draft) => draft.businessId === businessId) : drafts;
}
export async function saveDraft(report: InspectionReportDraft) {
  await evidenceStore.updateItem(RENTAL_DRAFTS_KEY, raw => {
    const drafts = parseStoredArray<InspectionReportDraft>(raw, "Inspection drafts");
    return JSON.stringify([...drafts.filter(item => item.id !== report.id), report]);
  });
}
export async function replaceDraft(previousId: string, report: InspectionReportDraft) {
  await evidenceStore.updateItem(RENTAL_DRAFTS_KEY, raw => {
    const drafts = parseStoredArray<InspectionReportDraft>(raw, "Inspection drafts");
    return JSON.stringify([...drafts.filter(item => item.id !== previousId && item.id !== report.id), report]);
  });
}
export async function removeDraft(id: string) {
  await evidenceStore.updateItem(RENTAL_DRAFTS_KEY, raw =>
    JSON.stringify(parseStoredArray<InspectionReportDraft>(raw, "Inspection drafts").filter(item => item.id !== id)));
}
export async function getDocuments(businessId?: string): Promise<SavedDocument[]> {
  const docs = parseStoredArray<SavedDocument>(await evidenceStore.getItem(RENTAL_DOCS_KEY), "Rental documents");
  return businessId ? docs.filter((doc) => doc.businessId === businessId) : docs;
}
export async function saveDocument(doc: SavedDocument) {
  await evidenceStore.updateItem(RENTAL_DOCS_KEY, raw =>
    JSON.stringify([doc, ...parseStoredArray<SavedDocument>(raw, "Rental documents").filter(d => d.id !== doc.id)]));
}
export async function cacheRentalProperty(property: RentalProperty) {
  await evidenceStore.updateItem(RENTAL_PROPERTY_CACHE, raw =>
    JSON.stringify([property, ...parseStoredArray<RentalProperty>(raw, "Rental property cache").filter(item => item.id !== property.id)]));
}
export async function getCachedRentalProperty(id: string, businessId: string): Promise<RentalProperty | undefined> {
  return parseStoredArray<RentalProperty>(await evidenceStore.getItem(RENTAL_PROPERTY_CACHE), "Rental property cache").find((item) => item.id === id && item.businessId === businessId);
}
export async function getCachedRentalProperties(businessId: string): Promise<RentalProperty[]> {
  return parseStoredArray<RentalProperty>(await evidenceStore.getItem(RENTAL_PROPERTY_CACHE), "Rental property cache").filter((item) => item.businessId === businessId);
}
export const isISODate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`)) && new Date(`${value}T00:00:00`).toISOString().slice(0, 10) === value;
export const formatDate = (value?: string) => value
  ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  : "Not set";
export const isWeb = Platform.OS === "web";