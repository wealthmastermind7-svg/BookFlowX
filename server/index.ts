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
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookFlow vs Alternatives | Premium Booking Infrastructure</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --pure-black: #000000;
            --charcoal: #111111;
            --graphite: #222222;
            --smoke: #444444;
            --silver: #888888;
            --pearl: #f5f5f7;
            --accent: #ffffff;
            --glass: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-hover: rgba(255, 255, 255, 0.06);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: var(--pure-black);
            color: var(--pearl);
            font-family: 'Inter', -apple-system, sans-serif;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        /* Abstract Video Background */
        .video-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            opacity: 0.4;
            background: radial-gradient(circle at 50% 50%, #111 0%, #000 100%);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 100px 24px;
        }

        .back-link {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--silver);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            margin-bottom: 60px;
            transition: color 0.3s;
        }
        .back-link:hover { color: var(--accent); }

        /* Oversized Typography */
        h1 {
            font-family: 'Cormorant Garamond', serif;
            font-size: clamp(3rem, 10vw, 6rem);
            font-weight: 400;
            line-height: 0.9;
            letter-spacing: -3px;
            margin-bottom: 40px;
            text-transform: uppercase;
        }

        .hero-desc {
            font-size: 22px;
            color: var(--silver);
            max-width: 650px;
            line-height: 1.4;
            margin-bottom: 100px;
            font-weight: 300;
        }

        /* Glassmorphic Grid */
        .comparison-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 24px;
            margin-bottom: 150px;
        }

        .card {
            background: var(--glass);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 48px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
            position: relative;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
        }

        .card:hover {
            background: var(--glass-hover);
            border-color: rgba(255,255,255,0.15);
            transform: translateY(-10px) scale(1.02);
        }

        .card h2 {
            font-family: 'Cormorant Garamond', serif;
            font-size: 32px;
            font-weight: 500;
            margin-bottom: 16px;
            letter-spacing: -1px;
        }

        .card p {
            font-size: 16px;
            color: var(--silver);
            line-height: 1.6;
            margin-bottom: 32px;
        }

        .card .vs-link {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        /* Circular Meters */
        .meter-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 80px;
            margin-bottom: 150px;
        }

        .meter-container {
            text-align: center;
        }

        .circular-meter {
            width: 150px;
            height: 150px;
            border-radius: 75px;
            border: 2px solid var(--graphite);
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .circular-meter::after {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border-radius: 75px;
            border: 2px solid var(--accent);
            clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
        }

        .meter-val {
            font-family: 'Cormorant Garamond', serif;
            font-size: 40px;
        }

        .meter-label {
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--silver);
        }

        /* Section Headers */
        .section-tag {
            font-size: 12px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: var(--silver);
            margin-bottom: 24px;
            display: block;
        }

        h3 {
            font-family: 'Cormorant Garamond', serif;
            font-size: 48px;
            margin-bottom: 40px;
            letter-spacing: -1px;
        }

        footer {
            border-top: 1px solid var(--graphite);
            padding-top: 60px;
            color: var(--smoke);
            font-size: 12px;
            letter-spacing: 1px;
            display: flex;
            justify-content: space-between;
        }

        @media (max-width: 768px) {
            h1 { font-size: 72px; }
            .comparison-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="video-bg"></div>
    
    <div class="container">
        <a href="/" class="back-link">← Return to BookFlow</a>
        
        <span class="section-tag">Market Comparison</span>
        <h1>BookFlow vs<br>Alternatives</h1>
        
        <p class="hero-desc">Experience the future of appointment management. While others build tools, we build luxury infrastructure for service leaders.</p>

        <div class="comparison-grid">
            <a href="/vs/calendly" class="card">
                <h2>Calendly</h2>
                <p>Functional but corporate. Calendly focuses on enterprise meeting links, while BookFlow focuses on the premium service experience.</p>
                <div class="vs-link">Detailed Audit →</div>
            </a>
            
            <a href="/vs/acuity" class="card">
                <h2>Acuity</h2>
                <p>Powerful but cluttered. Acuity offers deep customization at the cost of a complex, dated interface. BookFlow offers cinematic simplicity.</p>
                <div class="vs-link">Detailed Audit →</div>
            </a>
            
            <a href="/vs/simplybook" class="card">
                <h2>SimplyBook</h2>
                <p>Legacy booking systems lack the modern AI automation and liquid interface that keeps your clients coming back.</p>
                <div class="vs-link">Detailed Audit →</div>
            </a>
        </div>

        <span class="section-tag">Performance Metrics</span>
        <h3>Performance by Design</h3>
        
        <div class="meter-section">
            <div class="meter-container">
                <div class="circular-meter">
                    <span class="meter-val">98%</span>
                </div>
                <span class="meter-label">Booking Completion</span>
            </div>
            
            <div class="meter-container">
                <div class="circular-meter">
                    <span class="meter-val">45%</span>
                </div>
                <span class="meter-label">Churn Reduction</span>
            </div>
            
            <div class="meter-container">
                <div class="circular-meter">
                    <span class="meter-val">2s</span>
                </div>
                <span class="meter-label">Checkout Speed</span>
            </div>
        </div>

        <footer>
            <span>© 2026 BOOKFLOW INFRASTRUCTURE</span>
            <span>CINEMATIC LUXURY SETTINGS ENABLED</span>
        </footer>
    </div>
</body>
</html>`);
    }
  });

  app.get(["/support", "/help"], (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BookFlowX Support</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 40px auto; padding: 20px; color: #333; }
          h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .contact { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-top: 20px; }
          .email { font-weight: bold; color: #007AFF; }
        </style>
      </head>
      <body>
        <h1>BookFlowX Support</h1>
        <p>If you need help with the BookFlowX app, please contact us at:</p>
        <div class="contact">
          Email: <span class="email">admin@cerolauto.com</span>
        </div>
        <p>We typically respond within 24–48 hours.</p>
        <p>For urgent issues, please include your Apple ID email when contacting support.</p>
      </body>
      </html>
    `);
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

  app.get("/favicon.png", (_req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), "server/static/favicon.png"));
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
