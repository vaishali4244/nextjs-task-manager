import { z } from "zod";
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.email().trim().toLowerCase().max(254),
    password: z
      .string()
      .min(8)
      .refine(
        (p) => Buffer.byteLength(p, "utf8") <= 72,
        "Password must be at most 72 UTF-8 bytes",
      ),
  })
  .strict(); // role is deliberately not accepted!
export const loginSchema = registerSchema.pick({ email: true, password: true });
const taskFields = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    completed: z.boolean(),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: z.iso.datetime().nullable(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(5),
  })
  .strict();
// Defaults belong only to CREATE; applying them to PATCH can reset untouched fields.
export const taskSchema = taskFields.extend({
  description: taskFields.shape.description.default(""),
  completed: taskFields.shape.completed.default(false),
  priority: taskFields.shape.priority.default("medium"),
  dueDate: taskFields.shape.dueDate.default(null),
  tags: taskFields.shape.tags.default([]),
});
export const patchSchema = taskFields
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Send at least one field");
const booleanQuery = z.enum(["true", "false"]).transform((v) => v === "true");
export const querySchema = z
  .object({
    completed: booleanQuery.optional(),
    title: z.string().trim().max(120).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
    overdue: booleanQuery.optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sort: z.enum(["createdAt", "dueDate", "title"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, "from must precede to");
export const idSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");
