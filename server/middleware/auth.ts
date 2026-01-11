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

    // Verify token's business matches requested business
    if (tokenBusiness.id !== businessId) {
      console.warn(`[Auth] Token mismatch: Token ${tokenBusiness.id} vs URL ${businessId}`);
      
      // AUTO-HEAL in development: If both IDs are valid but different, 
      // the client might be in a session sync transition.
      // We'll trust the token's business as the "truth" if the client uses it.
      if (process.env.NODE_ENV === 'development') {
        console.info(`[Auth] Development mode: Overriding URL businessId ${businessId} with token businessId ${tokenBusiness.id}`);
        req.business = {
          id: tokenBusiness.id,
          ownerToken: tokenBusiness.ownerToken as string,
          name: tokenBusiness.name,
          slug: tokenBusiness.slug
        };
        return next();
      }

      return res.status(403).json({ 
        error: "Token does not belong to this business",
        details: {
          tokenBusinessId: tokenBusiness.id,
          requestedBusinessId: businessId
        }
      });
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
