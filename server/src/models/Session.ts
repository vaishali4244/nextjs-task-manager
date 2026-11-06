import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: { type: String, required: true }, // random JWT ID (jti), not the JWT itself
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const Session = mongoose.model("Session", schema);
