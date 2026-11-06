import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register, login, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again in 15 minutes." },
});
router.post("/register", limiter, register);
router.post("/login", limiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
export default router;
