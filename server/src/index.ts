import express, {
  Request,
  Response,
  NextFunction,
}                           from "express";
import dotenv               from "dotenv";
import cors                 from "cors";
import helmet               from "helmet";
import morgan               from "morgan";
import rateLimit            from "express-rate-limit";
import { clerkMiddleware }  from "@clerk/express";

// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Phase 1 and 2 routes â€” foundation and verification
import propertyRoutes       from "./routes/propertyRoutes";
import tenantRoutes         from "./routes/tenantRoutes";
import managerRoutes        from "./routes/managerRoutes";
import applicationRoutes    from "./routes/applicationRoutes";
import leaseRoutes          from "./routes/leaseRoutes";
import webhookRoutes        from "./routes/webhookRoutes";
import paymentRoutes        from "./routes/paymentRoutes";
import adminRoutes          from "./routes/adminRoutes";
import adminPaymentRoutes   from "./routes/adminPaymentRoutes";
import authRoutes           from "./routes/authRoutes";
import otpRoutes            from "./routes/otpRoutes";
import locationRoutes       from "./routes/locationRoutes";
// Phase 3.5 routes â€” property types and payment structures
import saleRoutes           from "./routes/saleRoutes";
import enquiryRoutes        from "./routes/enquiryRoutes";
import messageRoutes        from "./routes/messageRoutes";
import bookingRoutes        from "./routes/bookingRoutes";
import hostelRoutes         from "./routes/hostelRoutes";
import schoolRoutes         from "./routes/schoolRoutes";
import advancePaymentRoutes from "./routes/advancePaymentRoutes";
import leaseExpiryRoutes    from "./routes/leaseExpiryRoutes";
import verifyRoutes         from "./routes/verifyRoutes";
import auditRoutes          from "./routes/auditRoutes";

import reportingRoutes from "./routes/reportingRoutes";
import { reportTiming } from "./lib/reportPerf";
// â”€â”€ JOBS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Phase 1 and 2 jobs
import { startOverduePaymentJob } from "./jobs/overduePaymentJob";
import { startPaymentExpiryJob }  from "./jobs/paymentExpiryJob";
import { startReminderJob }       from "./jobs/reminderJob";
import { startReconciliationJob } from "./jobs/reconciliationJob";
// Phase 3.5 jobs
import { startLeaseExpiryJob }    from "./jobs/leaseExpiryJob";
import { startShortStayExpiryJob } from "./jobs/shortStayExpiryJob";
import { startSemesterExpiryJob } from "./jobs/semesterExpiryJob";
import { startPendingRemovalJob } from "./jobs/pendingRemovalJob";
import { startNotificationProcessorJob } from "./jobs/notificationProcessorJob";
import { startOccupancySnapshotJob } from "./jobs/occupancySnapshotJob";

dotenv.config();

const app      = express();
// Render (like any host) puts its own proxy in front of this server. Without this line every visitor
// looks like the same address, so address-based limits and audit entries would all share one bucket.
// TRUST_PROXY_HOPS = how many proxies sit between the visitor and this server (1 unless told otherwise).
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);
const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// In development with no ALLOWED_ORIGINS set all origins are allowed.
// In production only origins listed in ALLOWED_ORIGINS env var pass.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const isDev = NODE_ENV === "development" && ALLOWED_ORIGINS.length === 0;
    if (!origin || isDev || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    }
  },
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// â”€â”€ RATE LIMITERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Global limiter applied to all /api routes.
// Specific routes get additional targeted limiters in their route files.
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  // Reports have their own limits (see lib/reportGuards.ts); the Reports page makes 6 or 7 calls per load.
  skip:            (req) => req.originalUrl.startsWith("/api/reports"),
  message:         { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Auth routes limited more strictly â€” prevents brute force attacks
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { success: false, message: "Too many auth attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// OTP routes â€” very strict â€” max 3 per minute
// Prevents OTP farming and phone number enumeration
const otpLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             3,
  message:         { success: false, message: "Too many OTP requests. Please wait 1 minute." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Payment routes limited separately â€” prevents payment spam
const paymentLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             30,
  message:         { success: false, message: "Too many payment requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// â”€â”€ WEBHOOK ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Registered BEFORE express.json() â€” critical for Paystack webhooks.
// Paystack signature verification requires the raw request body bytes.
// If express.json() runs first it parses the body and the raw bytes are lost.
// HMAC-SHA512 verification will fail and all webhooks will be rejected.
app.use("/api/webhooks", webhookRoutes);

// â”€â”€ CORE MIDDLEWARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(cors(corsOptions));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// â”€â”€ CLERK MIDDLEWARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Registered BEFORE any route that uses requireAuth().
// Attaches req.auth to every incoming request.
// Controllers call (req as any).auth?.userId to get the verified Clerk identity.
// Without this middleware requireAuth() returns null on every request.
app.use(clerkMiddleware());

// â”€â”€ RATE LIMITING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use("/api",          generalLimiter);
app.use("/api/auth",     authLimiter);
app.use("/api/otp",      otpLimiter);
app.use("/api/payments", paymentLimiter);

// â”€â”€ API ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Phase 1 and 2 â€” foundation Â· verification Â· payments
app.use("/api/auth",              authRoutes);
app.use("/api/otp",               otpRoutes);
app.use("/api/locations",         locationRoutes);
app.use("/api/properties",        propertyRoutes);
app.use("/api/tenants",           tenantRoutes);
app.use("/api/managers",          managerRoutes);
app.use("/api/applications",      applicationRoutes);
app.use("/api/leases",            leaseRoutes);
app.use("/api/payments",          paymentRoutes);
app.use("/api/admin",             adminRoutes);
app.use("/api/admin/payments",    adminPaymentRoutes);

// Phase 3.5 â€” property types Â· sale Â· enquiry Â· messaging Â· bookings
app.use("/api/sale",              saleRoutes);
app.use("/api/enquiries",         enquiryRoutes);
app.use("/api/messages",          messageRoutes);
app.use("/api/bookings",          bookingRoutes);
app.use("/api/hostels",           hostelRoutes);
app.use("/api/schools",           schoolRoutes);
app.use("/api/advance-payments",  advancePaymentRoutes);
app.use("/api/lease-expiry",      leaseExpiryRoutes);
app.use("/api/verify",            verifyRoutes);
app.use("/api/audit",             auditRoutes);
app.use("/api/reports", reportTiming, reportingRoutes);

// â”€â”€ HEALTH CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Public endpoint â€” no auth required.
// Used by Railway / Render to confirm server is alive.
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status:      "ok",
    app:         "AskDerek API",
    environment: NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// â”€â”€ 404 HANDLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Catches any request that did not match a registered route.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// â”€â”€ GLOBAL ERROR HANDLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Catches any unhandled errors thrown inside route handlers.
// In development the full error message is returned for debugging.
// In production only a generic message is returned â€” internals never exposed.
app.use((
  err:   Error & { status?: number },
  _req:  Request,
  res:   Response,
  _next: NextFunction
) => {
  console.error("âŒ Unhandled error:", {
    message: err.message,
    stack:   NODE_ENV === "development" ? err.stack : undefined,
  });
  res.status(err.status || 500).json({
    success: false,
    message: NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

// â”€â”€ START SERVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const server = app.listen(PORT, () => {
  console.log(`\nðŸš€ AskDerek API is running`);
  console.log(`ðŸ” URL:       http://localhost:${PORT}`);
  console.log(`â¤ï¸  Health:    http://localhost:${PORT}/health`);

  console.log(`\nâ”€â”€ Phase 1 and 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`);
  console.log(`ðŸ”— Clerk:     http://localhost:${PORT}/api/webhooks/clerk`);
  console.log(`ðŸ’³ Paystack:  http://localhost:${PORT}/api/webhooks/paystack`);
  console.log(`ðŸ” Auth:      http://localhost:${PORT}/api/auth`);
  console.log(`ðŸ“± OTP:       http://localhost:${PORT}/api/otp`);
  console.log(`ðŸ“ Locations: http://localhost:${PORT}/api/locations`);
  console.log(`ðŸ˜ï¸  Properties:http://localhost:${PORT}/api/properties`);
  console.log(`ðŸ‘‘ Admin:     http://localhost:${PORT}/api/admin`);
  console.log(`ðŸ’° Payments:  http://localhost:${PORT}/api/payments`);

  console.log(`\nâ”€â”€ Phase 3.5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`);
  console.log(`ðŸ  Sale:      http://localhost:${PORT}/api/sale`);
  console.log(`ðŸ’¬ Enquiries: http://localhost:${PORT}/api/enquiries`);
  console.log(`ðŸ“¨ Messages:  http://localhost:${PORT}/api/messages`);
  console.log(`ðŸ“… Bookings:  http://localhost:${PORT}/api/bookings`);
  console.log(`ðŸ« Hostels:   http://localhost:${PORT}/api/hostels`);
  console.log(`ðŸŽ“ Schools:   http://localhost:${PORT}/api/schools`);
  console.log(`ðŸ’µ Advance:   http://localhost:${PORT}/api/advance-payments`);
  console.log(`ðŸ“‹ Expiry:    http://localhost:${PORT}/api/lease-expiry`);
  console.log(`ðŸ” Verify:    http://localhost:${PORT}/api/verify`);
  console.log(`ðŸ“Š Audit:     http://localhost:${PORT}/api/audit`);

  console.log(`\nðŸŒ ENV:       ${NODE_ENV}\n`);

  // â”€â”€ START CRON JOBS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Phase 1 and 2 jobs
  startOverduePaymentJob();
  startPaymentExpiryJob();
  startReminderJob();
  startReconciliationJob();
  // Phase 3.5 jobs
  startLeaseExpiryJob();
  startShortStayExpiryJob();
  startSemesterExpiryJob();
  startPendingRemovalJob();
  // Step 17 notification processor
  startNotificationProcessorJob();
  startOccupancySnapshotJob();
});

// â”€â”€ GRACEFUL SHUTDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Handles SIGTERM from Railway/Render and SIGINT from Ctrl+C.
// Gives active connections 10 seconds to finish before forcing exit.
const shutdown = (signal: string): void => {
  console.log(`\nâš ï¸  ${signal} received â€” shutting down gracefully...`);
  server.close(() => {
    console.log("âœ… Server closed. Goodbye.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("âŒ Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("âŒ Unhandled Promise Rejection:", reason);
  shutdown("unhandledRejection");
});
