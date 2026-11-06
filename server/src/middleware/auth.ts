import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { HttpError } from "../utils/http.js";
export const requireAuth: RequestHandler = async (req, _res, next) => {
  let payload;
  try {
    payload = jwt.verify(req.cookies.access_token ?? "", env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "task-api",
      audience: "task-web",
    });
  } catch {
    throw new HttpError(401, "Please log in again");
  }
  if (typeof payload === "string" || !payload.sub || !payload.jti)
    throw new HttpError(401, "Invalid token");
  const session = await Session.findOne({
    _id: payload.jti,
    user: payload.sub,
    expiresAt: { $gt: new Date() },
  }).lean();
  const user = session ? await User.findById(payload.sub).lean() : null;
  if (!user) throw new HttpError(401, "Session expired");
  // Load role from the database so promotions/demotions apply immediately.
  req.auth = {
    id: user._id.toString(),
    role: user.role as "user" | "admin",
    sessionId: payload.jti,
  };
  next();
};
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.auth?.role !== "admin")
    throw new HttpError(403, "Admin access required");
  next();
};
