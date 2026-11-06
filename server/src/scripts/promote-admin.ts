import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin -- email@example.com");
  process.exit(1);
}
try {
  await mongoose.connect(env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { new: true },
  );
  if (!user) {
    console.error("Register this account in the app first.");
    process.exitCode = 1;
  } else console.log(`Promoted ${user.email}. Reload the app.`);
} finally {
  await mongoose.disconnect();
}
