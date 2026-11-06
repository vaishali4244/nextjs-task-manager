import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const server = app.listen(env.PORT, () =>
    console.log(`API ready at http://localhost:${env.PORT}/api`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      server.close(() => {
        void mongoose.disconnect().then(() => process.exit(0));
      });
    });
} catch (error) {
  if (error instanceof Error) {
    console.error('MongoDB error name:', error.name);
    console.error('MongoDB error message:', error.message);
  }

  const detail = error instanceof Error ? error.message : String(error);
  console.error(
    `MongoDB error: ${detail.replace(
      /(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/gi,
      "$1[REDACTED]@",
    )}`,
  );
  process.exit(1);
}
