import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 2000 },
    completed: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date, default: null },
    tags: { type: [String], default: [] },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);
// Equality fields first, then sort field: useful for owner-scoped lists.
schema.index({ owner: 1, completed: 1, createdAt: -1 });
schema.index({ owner: 1, createdAt: -1 });
schema.index({ owner: 1, dueDate: 1 });
export const Task = mongoose.model("Task", schema);
