import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { users, tasks } from "../controllers/adminController.js";
const router = Router();
router.use(requireAuth, requireAdmin);
router.get("/users", users);
router.get("/tasks", tasks);
export default router;
