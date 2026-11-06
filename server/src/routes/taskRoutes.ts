import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  list,
  create,
  getOne,
  update,
  remove,
  stats,
} from "../controllers/taskController.js";
const router = Router();
router.use(requireAuth);
router.get("/stats", stats); // Named routes must come BEFORE /:id.
router.route("/").get(list).post(create);
router.route("/:id").get(getOne).patch(update).delete(remove);
export default router;
