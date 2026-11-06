import { test } from "node:test";
import assert from "node:assert/strict";
import {
  taskSchema,
  patchSchema,
  registerSchema,
  querySchema,
} from "../src/validation/schemas.js";
import { buildTaskQuery, escapeRegex } from "../src/utils/taskQuery.js";
test("create defaults, but partial updates never overwrite untouched fields", () => {
  const created = taskSchema.parse({ title: " Learn " });
  assert.equal(created.title, "Learn");
  assert.equal(created.completed, false);
  assert.equal(created.priority, "medium");
  assert.deepEqual(created.tags, []);
  assert.deepEqual(patchSchema.parse({ completed: true }), { completed: true });
  assert.deepEqual(patchSchema.parse({ title: "Changed" }), {
    title: "Changed",
  });
  assert.throws(() => patchSchema.parse({}));
});
test("body allowlist and types prevent role/owner injection", () => {
  assert.throws(() =>
    taskSchema.parse({ title: "Valid", owner: "someone-else" }),
  );
  assert.throws(() => taskSchema.parse({ title: "Valid", completed: "false" }));
  assert.throws(() =>
    taskSchema.parse({ title: "Valid", $set: { completed: true } }),
  );
  assert.throws(() =>
    registerSchema.parse({
      name: "Learner",
      email: "a@example.com",
      password: "Learning123",
      role: "admin",
    }),
  );
  assert.throws(() =>
    registerSchema.parse({
      name: "Learner",
      email: "a@example.com",
      password: "界".repeat(25),
    }),
  );
});
test("query validation parses booleans and rejects operators and oversized pagination", () => {
  assert.equal(querySchema.parse({ completed: "false" }).completed, false);
  for (const q of [
    { completed: { $ne: true } },
    { limit: "51" },
    { page: "0" },
    { sort: "passwordHash" },
    { title: ["a", "b"] },
    { from: "bad date" },
  ])
    assert.throws(() => querySchema.parse(q));
  assert.throws(() =>
    querySchema.parse({
      from: "2026-12-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
    }),
  );
});
test("literal regex escapes punctuation and owner stays in all filters", () => {
  assert.equal(escapeRegex("a+b[c].*"), "a\\+b\\[c\\]\\.\\*");
  const { filter } = buildTaskQuery(
    { title: "C++", completed: "false", priority: "high", tag: "Study" },
    "owner-id",
  );
  assert.equal(filter.owner, "owner-id");
  assert.equal(filter.completed, false);
  assert.equal(filter.priority, "high");
  assert.equal(filter.tags, "study");
  const expression = new RegExp(filter.title.$regex, filter.title.$options);
  assert.ok(expression.test("Learn c++"));
  assert.ok(!expression.test("Learn C"));
});
test("date range and overdue conditions compose instead of replacing each other", () => {
  const { filter } = buildTaskQuery(
    {
      overdue: "true",
      from: "2020-01-01T00:00:00.000Z",
      to: "2021-01-01T00:00:00.000Z",
    },
    "owner",
  );
  assert.equal(filter.$and?.length, 2);
  assert.equal(filter.$and?.[1].completed, false);
  assert.ok(filter.$and?.[0].dueDate.$gte instanceof Date);
  const nonOverdue = buildTaskQuery({ overdue: "false" }, "owner").filter;
  assert.equal(nonOverdue.$and?.[0].$or.length, 3);
});
