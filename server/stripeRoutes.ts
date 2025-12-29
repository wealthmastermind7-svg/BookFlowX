import type { Express, Request, Response } from "express";
import { stripeService } from "./stripeService";
import { storage } from "./storage";
import { getStripePublishableKey } from "./stripeClient";
import { 
  verifyBusinessOwnership, 
  type AuthenticatedRequest 
} from "./middleware/auth";

export function registerStripeRoutes(app: Express) {
  app.get("/api/stripe/config", async (req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  app.post("/api/businesses/:businessId/stripe/connect", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Stripe connect request for business:", req.params.businessId);
      
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        console.log("Business not found:", req.params.businessId);
        return res.status(404).json({ error: "Business not found" });
      }

      if (business.stripeAccountId) {
        console.log("Existing Stripe account found:", business.stripeAccountId);
        try {
          const account = await stripeService.getAccount(business.stripeAccountId);
          
          if (account.details_submitted) {
            console.log("Account already has details submitted");
            return res.json({ 
              status: "already_connected",
              accountId: business.stripeAccountId,
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
            });
          }
        } catch (getAccountError) {
          console.error("Error getting existing account:", getAccountError);
        }
        
        const protocol = req.protocol;
        const host = req.get("host") || "localhost:5000";
        const baseUrl = `${protocol}://${host}`;
        
        try {
          const accountLink = await stripeService.createAccountLink(
            business.stripeAccountId,
            `${baseUrl}/api/businesses/${business.id}/stripe/connect/return`,
            `${baseUrl}/api/businesses/${business.id}/stripe/connect/refresh`
          );
          
          console.log("Account link created for existing account");
          return res.json({ url: accountLink.url });
        } catch (linkError) {
          console.error("Error creating account link for existing account:", linkError);
          throw linkError;
        }
      }

      console.log("Creating new Stripe Connect account for business:", business.id);
      
      try {
        const account = await stripeService.createConnectAccount(
          business.id,
          business.email || "",
          business.name
        );

        console.log("Stripe account created:", account.id);

        await storage.updateBusiness(business.id, {
          stripeAccountId: account.id,
          stripeAccountStatus: "pending",
        });

        const protocol = req.protocol;
        const host = req.get("host") || "localhost:5000";
        const baseUrl = `${protocol}://${host}`;

        const accountLink = await stripeService.createAccountLink(
          account.id,
          `${baseUrl}/api/businesses/${business.id}/stripe/connect/return`,
          `${baseUrl}/api/businesses/${business.id}/stripe/connect/refresh`
        );

        console.log("Account link created for new account");
        res.json({ url: accountLink.url });
      } catch (stripeError) {
        console.error("Error creating Stripe account or link:", stripeError);
        throw stripeError;
      }
    } catch (error) {
      console.error("Error in Stripe connect endpoint:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to create Stripe Connect account",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  app.get("/api/businesses/:businessId/stripe/connect/return", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business || !business.stripeAccountId) {
        return res.redirect("/?stripe_error=not_found");
      }

      const account = await stripeService.getAccount(business.stripeAccountId);
      
      await storage.updateBusiness(business.id, {
        stripeAccountStatus: account.details_submitted ? "active" : "pending",
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
      });

      const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "localhost:8081";
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/:5000$/, "");
      
      res.redirect(`https://${cleanDomain}/?stripe_connected=true`);
    } catch (error) {
      console.error("Error handling Stripe Connect return:", error);
      res.redirect("/?stripe_error=unknown");
    }
  });

  app.get("/api/businesses/:businessId/stripe/connect/refresh", async (req: Request, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business || !business.stripeAccountId) {
        return res.redirect("/?stripe_error=not_found");
      }

      const protocol = req.protocol;
      const host = req.get("host") || "localhost:5000";
      const baseUrl = `${protocol}://${host}`;

      const accountLink = await stripeService.createAccountLink(
        business.stripeAccountId,
        `${baseUrl}/api/businesses/${business.id}/stripe/connect/return`,
        `${baseUrl}/api/businesses/${business.id}/stripe/connect/refresh`
      );

      res.redirect(accountLink.url);
    } catch (error) {
      console.error("Error refreshing Stripe Connect:", error);
      res.redirect("/?stripe_error=unknown");
    }
  });

  app.get("/api/businesses/:businessId/stripe/status", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      if (!business.stripeAccountId) {
        return res.json({
          connected: false,
          status: "not_connected",
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      try {
        const account = await stripeService.getAccount(business.stripeAccountId);
        
        if (account.charges_enabled !== business.stripeChargesEnabled ||
            account.payouts_enabled !== business.stripePayoutsEnabled) {
          await storage.updateBusiness(business.id, {
            stripeAccountStatus: account.details_submitted ? "active" : "pending",
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
          });
        }

        res.json({
          connected: true,
          status: account.details_submitted ? "active" : "pending",
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          accountId: business.stripeAccountId,
        });
      } catch (error) {
        res.json({
          connected: false,
          status: "error",
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }
    } catch (error) {
      console.error("Error getting Stripe status:", error);
      res.status(500).json({ error: "Failed to get Stripe status" });
    }
  });

  app.get("/api/businesses/:businessId/stripe/dashboard", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business || !business.stripeAccountId) {
        return res.status(404).json({ error: "Stripe account not found" });
      }

      const loginLink = await stripeService.createLoginLink(business.stripeAccountId);
      res.json({ url: loginLink.url });
    } catch (error) {
      console.error("Error creating Stripe dashboard link:", error);
      res.status(500).json({ error: "Failed to create dashboard link" });
    }
  });

  app.get("/api/businesses/:businessId/stripe/balance", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const business = await storage.getBusiness(req.params.businessId);
      if (!business || !business.stripeAccountId) {
        return res.status(404).json({ error: "Stripe account not found" });
      }

      const balance = await stripeService.getBalance(business.stripeAccountId);
      res.json(balance);
    } catch (error) {
      console.error("Error getting Stripe balance:", error);
      res.status(500).json({ error: "Failed to get balance" });
    }
  });

  app.post("/api/businesses/:businessId/bookings/:bookingId/checkout", async (req: Request, res: Response) => {
    try {
      const { businessId, bookingId } = req.params;
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      if (!business.stripeAccountId || !business.stripeChargesEnabled) {
        return res.status(400).json({ error: "Business has not set up payments" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.businessId !== businessId) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const service = await storage.getService(booking.serviceId);
      const customer = await storage.getCustomer(booking.customerId);

      const protocol = req.protocol;
      const host = req.get("host") || "localhost:5000";
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession(
        booking.totalPrice,
        "usd",
        business.stripeAccountId,
        `${baseUrl}/api/bookings/${bookingId}/payment/success`,
        `${baseUrl}/api/bookings/${bookingId}/payment/cancel`,
        {
          bookingId: booking.id,
          businessId: business.id,
          serviceName: service?.name || "Service",
          serviceDescription: service?.description || "",
          customerName: customer?.name || "",
          customerEmail: customer?.email || "",
        }
      );

      await storage.updateBooking(bookingId, {
        stripeCheckoutSessionId: session.id,
        paymentStatus: "pending",
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/bookings/:bookingId/payment/success", async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      
      await storage.updateBooking(bookingId, {
        paymentStatus: "paid",
        status: "confirmed",
      });

      const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "localhost:8081";
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/:5000$/, "");
      
      res.redirect(`https://${cleanDomain}/?payment_success=true&booking_id=${bookingId}`);
    } catch (error) {
      console.error("Error handling payment success:", error);
      res.redirect("/?payment_error=unknown");
    }
  });

  app.get("/api/bookings/:bookingId/payment/cancel", async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      
      await storage.updateBooking(bookingId, {
        paymentStatus: "unpaid",
      });

      const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "localhost:8081";
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/:5000$/, "");
      
      res.redirect(`https://${cleanDomain}/?payment_cancelled=true&booking_id=${bookingId}`);
    } catch (error) {
      console.error("Error handling payment cancel:", error);
      res.redirect("/?payment_error=unknown");
    }
  });

  app.post("/api/businesses/:businessId/quick-sale", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { amount, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      if (!business.stripeAccountId || !business.stripeChargesEnabled) {
        return res.status(400).json({ error: "Business has not set up payments" });
      }

      const domain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "localhost:8081";
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/:5000$/, "");
      const baseUrl = `https://${cleanDomain}`;

      const session = await stripeService.createQuickSaleSession(
        amount,
        "usd",
        business.stripeAccountId,
        description || "Quick Sale",
        `${baseUrl}/?quick_sale_success=true`,
        `${baseUrl}/?quick_sale_cancelled=true`,
        business.id
      );

      const quickSale = await storage.createQuickSale({
        businessId,
        amount,
        description: description || "Quick Sale",
        status: "pending",
        stripePaymentIntentId: session.payment_intent as string || session.id,
      });

      res.json({
        quickSaleId: quickSale.id,
        paymentUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      console.error("Error creating quick sale:", error);
      res.status(500).json({ error: "Failed to create quick sale" });
    }
  });

  app.get("/api/businesses/:businessId/quick-sales", verifyBusinessOwnership, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const quickSales = await storage.getQuickSales(req.params.businessId);
      res.json(quickSales);
    } catch (error) {
      console.error("Error getting quick sales:", error);
      res.status(500).json({ error: "Failed to get quick sales" });
    }
  });

  app.patch("/api/quick-sales/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const quickSale = await storage.updateQuickSale(req.params.id, { status });
      if (!quickSale) {
        return res.status(404).json({ error: "Quick sale not found" });
      }
      res.json(quickSale);
    } catch (error) {
      console.error("Error updating quick sale:", error);
      res.status(500).json({ error: "Failed to update quick sale" });
    }
  });
}
