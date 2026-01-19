import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerStripeRoutes } from "./stripeRoutes";
import { WebhookHandlers } from "./webhookHandlers";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    // Allow localhost origins for local development
    origins.add("http://localhost:8081");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:8081");
    origins.add("http://127.0.0.1:5000");

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
      // Also allow the domain without explicit port (for webview)
      const devDomain = process.env.REPLIT_DEV_DOMAIN;
      if (!devDomain.includes(":")) {
        origins.add(`https://${devDomain}:5000`);
      }
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        const domain = d.trim();
        origins.add(`https://${domain}`);
        if (!domain.includes(":")) {
          origins.add(`https://${domain}:5000`);
        }
      });
    }

    // Add production domain if it exists
    const prodDomain = process.env.API_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN;
    if (prodDomain) {
      const cleanProd = prodDomain.replace(/^https?:\/\//, '').replace(/:5000$/, '');
      origins.add(`https://${cleanProd}`);
    }

    const origin = req.header("origin");

    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-owner-token, x-business-token");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/home" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/" || req.path === "/home") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/attached_assets", express.static(path.resolve(process.cwd(), "attached_assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }

  try {
    log("Initializing Stripe schema...");
    await runMigrations({ 
      databaseUrl
    });
    log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      if (result?.webhook?.url) {
        log(`Webhook configured: ${result.webhook.url}`);
      } else {
        log("Webhook setup skipped - no URL returned");
      }
    } catch (webhookError) {
      log("Webhook setup skipped:", webhookError);
    }

    stripeSync.syncBackfill()
      .then(() => {
        log("Stripe data synced");
      })
      .catch((err: unknown) => {
        log("Error syncing Stripe data:", err);
      });
  } catch (error) {
    log("Failed to initialize Stripe:", error);
  }
}

import cron from "node-cron";
import { processReminders } from "./workflowEngine";

(async () => {
  setupCors(app);
  
  // Start background reminder processing every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    processReminders().catch(err => console.error("[Cron] Reminder error:", err));
  });

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          log("STRIPE WEBHOOK ERROR: req.body is not a Buffer.");
          return res.status(500).json({ error: "Webhook processing error" });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        log("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    }
  );

  setupBodyParsing(app);
  setupRequestLogging(app);

  // Legal routes registered EARLY for maximum priority
  // Try multiple paths for production compatibility
  const findTemplate = (filename: string): string | null => {
    const paths = [
      path.resolve(process.cwd(), "server/templates", filename),
      path.resolve(process.cwd(), "server_dist/templates", filename),
      path.resolve(process.cwd(), "templates", filename),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  };

  // Inline fallback content for production when files aren't available
  const privacyPolicyFallback = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy | BookFlow</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #fff; }
        h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 2rem; }
        h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; }
        p { margin-bottom: 1rem; color: #4a4a4a; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #000; text-decoration: none; font-weight: 600; }
        footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9rem; color: #888; }
    </style>
</head>
<body>
    <a href="/" class="back-link">← Back to Home</a>
    <h1>Privacy Policy</h1>
    <p>Last Updated: January 10, 2026</p>
    <p>At BookFlow, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our booking platform.</p>
    <h2>1. Information We Collect</h2>
    <p>We collect information that you provide directly to us, including your name, email address, phone number, and any other information you choose to provide when making a booking or setting up a business profile.</p>
    <h2>2. How We Use Your Information</h2>
    <p>We use the information we collect to facilitate bookings, communicate with you about your appointments, and improve our services. We do not sell your personal information to third parties.</p>
    <h2>3. Data Security</h2>
    <p>We implement a variety of security measures to maintain the safety of your personal information. Your data is stored securely using industry-standard encryption.</p>
    <h2>4. Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us at <strong>admin@cerolauto.com</strong>.</p>
    <footer>&copy; 2026 BookFlow. All rights reserved.</footer>
</body>
</html>`;

  const termsFallback = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service | BookFlow</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #fff; }
        h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 2rem; }
        h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; }
        p { margin-bottom: 1rem; color: #4a4a4a; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #000; text-decoration: none; font-weight: 600; }
        footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9rem; color: #888; }
    </style>
</head>
<body>
    <a href="/" class="back-link">← Back to Home</a>
    <h1>Terms of Service</h1>
    <p>Last Updated: January 10, 2026</p>
    <p>By using BookFlow, you agree to the following terms and conditions. Please read them carefully.</p>
    <h2>1. Use of Service</h2>
    <p>You agree to use BookFlow only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the platform.</p>
    <h2>2. Business Responsibilities</h2>
    <p>Businesses using BookFlow are responsible for managing their own availability, services, and customer communications accurately. BookFlow is not responsible for disputes between businesses and their customers.</p>
    <h2>3. Subscriptions and Payments</h2>
    <p>Premium features are available through subscription tiers. All payments are processed securely, and subscriptions can be managed through the app settings.</p>
    <h2>4. Limitation of Liability</h2>
    <p>BookFlow shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our services.</p>
    <h2>5. Contact Us</h2>
    <p>For any questions regarding these terms, please contact us at <strong>admin@cerolauto.com</strong>.</p>
    <footer>&copy; 2026 BookFlow. All rights reserved.</footer>
</body>
</html>`;

  app.get("/alternatives", (_req: Request, res: Response) => {
    const templatePath = findTemplate("alternatives.html");
    if (templatePath) {
      res.sendFile(templatePath);
    } else {
      res.status(404).send("Alternatives page not found");
    }
  });

  app.get("/privacy-policy", (_req: Request, res: Response) => {
    const templatePath = findTemplate("privacy-policy.html");
    if (templatePath) {
      res.sendFile(templatePath);
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(privacyPolicyFallback);
    }
  });

  app.get("/terms", (_req: Request, res: Response) => {
    const templatePath = findTemplate("terms.html");
    if (templatePath) {
      res.sendFile(templatePath);
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(termsFallback);
    }
  });

  app.get("/googlec99eb3b619abbef4.html", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send("google-site-verification: googlec99eb3b619abbef4.html");
  });

  configureExpoAndLanding(app);

  await initStripe();

  registerStripeRoutes(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
