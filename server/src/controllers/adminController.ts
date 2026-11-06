import type { RequestHandler } from "express";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { buildTaskQuery } from "../utils/taskQuery.js";
export const users: RequestHandler = async (req, res) => {
  const { q } = buildTaskQuery(req.query);
  const [users, total] = await Promise.all([
    User.find()
      .select("name email role createdAt")
      .sort({ createdAt: -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    User.countDocuments(),
  ]);
  res.json({ users, total, page: q.page, pages: Math.ceil(total / q.limit) });
};
export const tasks: RequestHandler = async (req, res) => {
  const { filter, q } = buildTaskQuery(req.query);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("owner", "name email")
      .sort({ [q.sort]: q.order === "asc" ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Task.countDocuments(filter),
  ]);
  res.json({ tasks, total, page: q.page, pages: Math.ceil(total / q.limit) });
};
