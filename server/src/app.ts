import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { HttpError } from "./utils/http.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many requests. Try shortly." },
  }),
);
// Cookie authentication needs CSRF defense. Fail closed for mutations, even login.
// Our browser always sends Origin. curl/Postman must explicitly set it too.
app.use((req, _res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") !== env.CLIENT_ORIGIN
  ) {
    throw new HttpError(403, "Untrusted or missing Origin");
  }
  next();
});
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/admin", adminRoutes);
app.use((_req, _res, next) => next(new HttpError(404, "Route not found")));
const errors: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({
        message: "Validation failed",
        errors: err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    return;
  }
  if (err?.code === 11000) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ message: "Request body too large" });
    return;
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error("Unexpected server error:", err.name);
  res
    .status(status)
    .json({ message: status === 500 ? "Internal server error" : err.message });
};
app.use(errors);
