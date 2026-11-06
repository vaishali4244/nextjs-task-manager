import type { FilterQuery } from "mongoose";
import { querySchema } from "../validation/schemas.js";
// Escape regex syntax: searching for "a+b" means literal a+b, not a pattern.
export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function buildTaskQuery(raw: unknown, owner?: string) {
  const q = querySchema.parse(raw);
  const filter: FilterQuery<unknown> = owner ? { owner } : {};
  if (q.completed !== undefined) filter.completed = q.completed;
  if (q.title) filter.title = { $regex: escapeRegex(q.title), $options: "i" };
  if (q.priority) filter.priority = q.priority;
  if (q.tag) filter.tags = q.tag;
  const conditions: FilterQuery<unknown>[] = [];
  if (q.from || q.to)
    conditions.push({
      dueDate: {
        ...(q.from ? { $gte: new Date(q.from) } : {}),
        ...(q.to ? { $lte: new Date(q.to) } : {}),
      },
    });
  if (q.overdue === true)
    conditions.push({
      completed: false,
      dueDate: { $ne: null, $lt: new Date() },
    });
  if (q.overdue === false)
    conditions.push({
      $or: [
        { completed: true },
        { dueDate: null },
        { dueDate: { $gte: new Date() } },
      ],
    });
  if (conditions.length) filter.$and = conditions;
  return { q, filter };
}
