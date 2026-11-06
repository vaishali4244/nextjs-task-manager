import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CLIENT_ORIGIN: z.url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine((s) => !s.startsWith("replace-with"), "Generate your own secret"),
});
export const env = schema.parse(process.env);
