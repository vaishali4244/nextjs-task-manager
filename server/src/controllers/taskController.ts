import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { taskSchema, patchSchema, idSchema } from "../validation/schemas.js";
import { buildTaskQuery } from "../utils/taskQuery.js";
import { HttpError } from "../utils/http.js";
export const list: RequestHandler = async (req, res) => {
  const { q, filter } = buildTaskQuery(req.query, req.auth!.id);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [q.sort]: q.order === "asc" ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Task.countDocuments(filter),
  ]);
  res.json({ tasks, total, page: q.page, pages: Math.ceil(total / q.limit) });
};
export const create: RequestHandler = async (req, res) => {
  const data = taskSchema.parse(req.body);
  const task = await Task.create({ ...data, owner: req.auth!.id });
  res.status(201).json({ task });
};
export const getOne: RequestHandler = async (req, res) => {
  const task = await Task.findOne({
    _id: idSchema.parse(req.params.id),
    owner: req.auth!.id,
  }).lean();
  if (!task) throw new HttpError(404, "Task not found");
  res.json({ task });
};
export const update: RequestHandler = async (req, res) => {
  const data = patchSchema.parse(req.body);
  // Ownership and update are one atomic query. Never spread raw req.body here.
  const task = await Task.findOneAndUpdate(
    { _id: idSchema.parse(req.params.id), owner: req.auth!.id },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!task) throw new HttpError(404, "Task not found");
  res.json({ task });
};
export const remove: RequestHandler = async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: idSchema.parse(req.params.id),
    owner: req.auth!.id,
  });
  if (!task) throw new HttpError(404, "Task not found");
  res.status(204).send();
};
export const stats: RequestHandler = async (req, res) => {
  const [summary] = await Task.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.auth!.id) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ["$completed", 1, 0] } },
        highPriority: {
          $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        completed: 1,
        highPriority: 1,
        pending: { $subtract: ["$total", "$completed"] },
      },
    },
  ]);
  res.json(summary ?? { total: 0, completed: 0, highPriority: 0, pending: 0 });
};
