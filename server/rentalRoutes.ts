import { Router, type Express, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  insertInspectionReportSchema,
  insertRentalPropertySchema,
  updateInspectionReportSchema,
  updateRentalPropertySchema,
} from "@shared/schema";
import type { IStorage } from "./storage";

export type RentalStorage = Pick<
  IStorage,
  | "getBusinessByToken"
  | "getRentalProperties"
  | "getRentalProperty"
  | "createRentalProperty"
  | "updateRentalProperty"
  | "getInspectionReports"
  | "getInspectionReport"
  | "createInspectionReport"
  | "updateInspectionReport"
>;

interface RentalRequest extends Request {
  rentalBusinessId?: string;
}

function ownerBusinessId(req: Request): string | undefined {
  return req.get("x-owner-token") || req.get("x-business-token");
}

function authorizedBusinessId(req: Request): string {
  return (req as RentalRequest).rentalBusinessId!;
}

function handleValidationError(error: unknown, res: Response): boolean {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.errors });
    return true;
  }
  return false;
}

function withoutManagedFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { id, businessId, propertyId, createdAt, updatedAt, ...payload } = value as Record<string, unknown>;
  return payload;
}

export function createRentalRouter(storage: RentalStorage): Router {
  const router = Router();

  const authorizeBusiness = async (req: RentalRequest, res: Response, next: NextFunction) => {
    try {
      const token = ownerBusinessId(req);
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const business = await storage.getBusinessByToken(token);
      if (!business) return res.status(403).json({ error: "Invalid authentication token" });
      if (business.id !== req.params.businessId) {
        return res.status(403).json({ error: "Token does not own this business" });
      }
      req.rentalBusinessId = business.id;
      next();
    } catch {
      res.status(500).json({ error: "Authentication error" });
    }
  };

  const authorizeRental = async (req: RentalRequest, res: Response, next: NextFunction) => {
    try {
      const token = ownerBusinessId(req);
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const business = await storage.getBusinessByToken(token);
      if (!business) return res.status(403).json({ error: "Invalid authentication token" });
      const property = await storage.getRentalProperty(req.params.id);
      if (!property) return res.status(404).json({ error: "Rental property not found" });
      if (property.businessId !== business.id) return res.status(403).json({ error: "Token does not own this rental property" });
      req.rentalBusinessId = business.id;
      next();
    } catch {
      res.status(500).json({ error: "Authentication error" });
    }
  };

  const authorizeInspection = async (req: RentalRequest, res: Response, next: NextFunction) => {
    try {
      const token = ownerBusinessId(req);
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const business = await storage.getBusinessByToken(token);
      if (!business) return res.status(403).json({ error: "Invalid authentication token" });
      const report = await storage.getInspectionReport(req.params.id);
      if (!report) return res.status(404).json({ error: "Inspection report not found" });
      if (report.businessId !== business.id) return res.status(403).json({ error: "Token does not own this inspection report" });
      req.rentalBusinessId = business.id;
      next();
    } catch {
      res.status(500).json({ error: "Authentication error" });
    }
  };

  router.get("/businesses/:businessId/rentals", authorizeBusiness, async (req, res) => {
    try {
      res.json(await storage.getRentalProperties(authorizedBusinessId(req)));
    } catch {
      res.status(500).json({ error: "Failed to fetch rental properties" });
    }
  });

  router.post("/businesses/:businessId/rentals", authorizeBusiness, async (req, res) => {
    try {
      const data = insertRentalPropertySchema.parse(withoutManagedFields(req.body));
      const property = await storage.createRentalProperty({ ...data, businessId: authorizedBusinessId(req) });
      res.status(201).json(property);
    } catch (error) {
      if (handleValidationError(error, res)) return;
      res.status(500).json({ error: "Failed to create rental property" });
    }
  });

  router.get("/rentals/:id", authorizeRental, async (req, res) => {
    try {
      const property = await storage.getRentalProperty(req.params.id);
      if (!property || property.businessId !== authorizedBusinessId(req)) {
        return res.status(404).json({ error: "Rental property not found" });
      }
      res.json(property);
    } catch {
      res.status(500).json({ error: "Failed to fetch rental property" });
    }
  });

  router.put("/rentals/:id", authorizeRental, async (req, res) => {
    try {
      const updates = updateRentalPropertySchema.parse(withoutManagedFields(req.body));
      const property = await storage.updateRentalProperty(req.params.id, updates);
      if (!property) return res.status(404).json({ error: "Rental property not found" });
      res.json(property);
    } catch (error) {
      if (handleValidationError(error, res)) return;
      res.status(500).json({ error: "Failed to update rental property" });
    }
  });

  router.get("/rentals/:id/inspections", authorizeRental, async (req, res) => {
    try {
      res.json(await storage.getInspectionReports(req.params.id));
    } catch {
      res.status(500).json({ error: "Failed to fetch inspection reports" });
    }
  });

  router.post("/rentals/:id/inspections", authorizeRental, async (req, res) => {
    try {
      const data = insertInspectionReportSchema.parse(withoutManagedFields(req.body));
      const report = await storage.createInspectionReport({
        ...data,
        businessId: authorizedBusinessId(req),
        propertyId: req.params.id,
      });
      res.status(201).json(report);
    } catch (error) {
      if (handleValidationError(error, res)) return;
      res.status(500).json({ error: "Failed to create inspection report" });
    }
  });

  router.get("/inspections/:id", authorizeInspection, async (req, res) => {
    try {
      const report = await storage.getInspectionReport(req.params.id);
      if (!report || report.businessId !== authorizedBusinessId(req)) {
        return res.status(404).json({ error: "Inspection report not found" });
      }
      res.json(report);
    } catch {
      res.status(500).json({ error: "Failed to fetch inspection report" });
    }
  });

  router.put("/inspections/:id", authorizeInspection, async (req, res) => {
    try {
      const updates = updateInspectionReportSchema.parse(withoutManagedFields(req.body));
      const report = await storage.updateInspectionReport(req.params.id, updates);
      if (!report) return res.status(404).json({ error: "Inspection report not found" });
      res.json(report);
    } catch (error) {
      if (handleValidationError(error, res)) return;
      res.status(500).json({ error: "Failed to update inspection report" });
    }
  });

  return router;
}

export function registerRentalRoutes(app: Express, storage: RentalStorage): void {
  app.use("/api", createRentalRouter(storage));
}