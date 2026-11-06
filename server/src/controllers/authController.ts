import type { RequestHandler, CookieOptions } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";
import { HttpError } from "../utils/http.js";
const cookie: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
const publicUser = (u: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });
export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: "user" });
  res
    .status(201)
    .json({
      user: publicUser(user),
      message: "Account created. Please log in.",
    });
};
export const login: RequestHandler = async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new HttpError(401, "Invalid email or password");
  // Re-login in the same browser invalidates its previous session.
  let previousSessionId: string | undefined;
  try {
    const old = jwt.verify(req.cookies.access_token ?? "", env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "task-api",
      audience: "task-web",
    });
    if (typeof old !== "string") previousSessionId = old.jti;
  } catch {
    /* Missing/expired previous cookie needs no cleanup. TTL handles it. */
  }
  if (previousSessionId) await Session.deleteOne({ _id: previousSessionId });
  const sessionId = randomUUID();
  await Session.create({
    _id: sessionId,
    user: user._id,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const token = jwt.sign({}, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    jwtid: sessionId,
    expiresIn: "1h",
    issuer: "task-api",
    audience: "task-web",
  });
  res
    .cookie("access_token", token, { ...cookie, maxAge: 3600_000 })
    .json({ user: publicUser(user) });
};
export const me: RequestHandler = async (req, res) => {
  const user = await User.findById(req.auth!.id).orFail();
  res.json({ user: publicUser(user) });
};
export const logout: RequestHandler = async (req, res) => {
  // Expired cookies can still be cleared. Valid sessions are revoked immediately.
  let sessionId: string | undefined;
  try {
    const p = jwt.verify(req.cookies.access_token ?? "", env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "task-api",
      audience: "task-web",
    });
    if (typeof p !== "string") sessionId = p.jti;
  } catch {
    /* invalid cookie */
  }
  // Database failures must reach the error handler, not falsely report revocation.
  if (sessionId) await Session.deleteOne({ _id: sessionId });
  res.clearCookie("access_token", cookie).json({ message: "Logged out" });
};
