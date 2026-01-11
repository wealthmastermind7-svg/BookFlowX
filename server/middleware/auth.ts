import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  business?: {
    id: string;
    ownerToken: string;
    name: string;
    slug: string;
  };
}

export async function verifyBusinessOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.params.businessId || req.params.id;
    const ownerToken = req.get("x-owner-token") || req.get("x-business-token");

    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    if (!ownerToken) {
      console.warn(`[Auth] Missing token for business ${businessId}. Headers received:`, Object.keys(req.headers));
      return res.status(401).json({ error: "Authentication required" });
    }

    // First, verify the token exists and get the business it belongs to
    const tokenBusiness = await storage.getBusinessByToken(ownerToken);
    if (!tokenBusiness) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Then, verify the token's business matches the requested business
    // This prevents cross-tenant access even if someone has a valid token for a different business
    if (tokenBusiness.id !== businessId) {
      console.warn(`[Auth] Token mismatch: Token business ${tokenBusiness.id} requested ${businessId}`);
      // Fallback: If both are valid but don't match, we might have a session sync issue
      // We'll allow it if the token is valid for SOME business and we're in dev, but for now just log
      return res.status(403).json({ error: `Token does not belong to this business. Expected ${businessId}, got ${tokenBusiness.id}` });
    }

    req.business = {
      id: tokenBusiness.id,
      ownerToken: tokenBusiness.ownerToken!,
      name: tokenBusiness.name,
      slug: tokenBusiness.slug,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

export async function verifyServiceOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const serviceId = req.params.id;
    const ownerToken = req.get("x-owner-token") || req.get("x-business-token");

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    if (!ownerToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // First, verify the token exists and get the business it belongs to
    const tokenBusiness = await storage.getBusinessByToken(ownerToken);
    if (!tokenBusiness) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Then, verify the service exists and belongs to the token's business
    const service = await storage.getService(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.businessId !== tokenBusiness.id) {
      return res.status(403).json({ error: "Token does not own this service" });
    }

    req.business = {
      id: tokenBusiness.id,
      ownerToken: tokenBusiness.ownerToken!,
      name: tokenBusiness.name,
      slug: tokenBusiness.slug,
    };

    next();
  } catch (error) {
    console.error("Service auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

export async function verifyBookingOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const bookingId = req.params.id;
    const ownerToken = req.get("x-owner-token") || req.get("x-business-token");

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    if (!ownerToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // First, verify the token exists and get the business it belongs to
    const tokenBusiness = await storage.getBusinessByToken(ownerToken);
    if (!tokenBusiness) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Then, verify the booking exists and belongs to the token's business
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.businessId !== tokenBusiness.id) {
      return res.status(403).json({ error: "Token does not own this booking" });
    }

    req.business = {
      id: tokenBusiness.id,
      ownerToken: tokenBusiness.ownerToken!,
      name: tokenBusiness.name,
      slug: tokenBusiness.slug,
    };

    next();
  } catch (error) {
    console.error("Booking auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

export async function verifyCustomerOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const customerId = req.params.id;
    const ownerToken = req.get("x-owner-token") || req.get("x-business-token");

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    if (!ownerToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // First, verify the token exists and get the business it belongs to
    const tokenBusiness = await storage.getBusinessByToken(ownerToken);
    if (!tokenBusiness) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Then, verify the customer exists and belongs to the token's business
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (customer.businessId !== tokenBusiness.id) {
      return res.status(403).json({ error: "Token does not own this customer" });
    }

    req.business = {
      id: tokenBusiness.id,
      ownerToken: tokenBusiness.ownerToken!,
      name: tokenBusiness.name,
      slug: tokenBusiness.slug,
    };

    next();
  } catch (error) {
    console.error("Customer auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}
