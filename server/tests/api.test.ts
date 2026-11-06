import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";
process.env.MONGODB_URI = "mongodb://127.0.0.1/test";
process.env.CLIENT_ORIGIN = "http://localhost:3000";
const { app } = await import("../src/app.js");
const { User } = await import("../src/models/User.js");
const { Task } = await import("../src/models/Task.js");
const { escapeRegex } = await import("../src/utils/taskQuery.js");
const origin = "http://localhost:3000";
let mongo: MongoMemoryServer;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Task.init()]);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
const credentials = { email: "alice@example.com", password: "Learning123!" };
test("registration, roles, validation, cookies, owner isolation, queries, logout", async () => {
  const alice = request.agent(app),
    bob = request.agent(app);
  await alice
    .post("/api/auth/register")
    .send({ name: "Alice", ...credentials })
    .expect(403);
  await alice
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({ name: "Alice", ...credentials, role: "admin" })
    .expect(400);
  await alice
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({ name: "Alice", ...credentials })
    .expect(201);
  await alice
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({ name: "Alice", ...credentials })
    .expect(409);
  await alice
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ ...credentials, password: "incorrect123" })
    .expect(401);
  const login = await alice
    .post("/api/auth/login")
    .set("Origin", origin)
    .send(credentials)
    .expect(200);
  const cookie = login.headers["set-cookie"][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(login.body.user.role, "user");
  assert.equal(login.body.token, undefined);
  await alice.get("/api/admin/users").expect(403);
  await request(app).get("/api/tasks").expect(401);
  await alice
    .post("/api/tasks")
    .set("Origin", origin)
    .send({ title: "" })
    .expect(400);
  await alice
    .post("/api/tasks")
    .set("Origin", origin)
    .send({ title: "Hidden owner", owner: new mongoose.Types.ObjectId() })
    .expect(400);
  const created = await alice
    .post("/api/tasks")
    .set("Origin", origin)
    .send({
      title: "Learn C++",
      priority: "high",
      tags: ["study"],
      dueDate: "2020-01-01T00:00:00.000Z",
    })
    .expect(201);
  const id = created.body.task._id;
  await alice
    .post("/api/tasks")
    .set("Origin", origin)
    .send({ title: "Read notes", completed: true })
    .expect(201);
  await alice
    .post("/api/tasks")
    .set("Origin", origin)
    .send({ title: "Future work", dueDate: "2099-01-01T00:00:00.000Z" })
    .expect(201);
  await alice.get(`/api/tasks/${id}`).expect(200);
  await alice.get("/api/tasks/not-valid").expect(400);
  for (const filter of [
    "completed=false&priority=high",
    "title=C%2B%2B",
    "tag=study",
    "overdue=true",
    "from=2019-01-01T00:00:00.000Z&to=2021-01-01T00:00:00.000Z",
  ]) {
    const result = await alice.get(`/api/tasks?${filter}`).expect(200);
    assert.equal(result.body.total, 1, filter);
  }
  const notOverdue = await alice.get("/api/tasks?overdue=false").expect(200);
  assert.equal(notOverdue.body.total, 2);
  const titleLiteral = await alice.get("/api/tasks?title=.*").expect(200);
  assert.equal(titleLiteral.body.total, 0);
  assert.equal(escapeRegex("a+b[c].*"), "a\\+b\\[c\\]\\.\\*");
  await alice.get("/api/tasks?completed=yes").expect(400);
  await alice.get("/api/tasks?completed[$ne]=true").expect(400);
  await alice.get("/api/tasks?limit=500").expect(400);
  const paged = await alice.get("/api/tasks?limit=1&page=2").expect(200);
  assert.equal(paged.body.tasks.length, 1);
  assert.equal(paged.body.pages, 3);
  const stats = await alice.get("/api/tasks/stats").expect(200);
  assert.equal(stats.body.total, 3);
  assert.equal(stats.body.completed, 1);
  await bob
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({ name: "Bob", email: "bob@example.com", password: "Learning123!" })
    .expect(201);
  await bob
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "bob@example.com", password: "Learning123!" })
    .expect(200);
  await bob.get(`/api/tasks/${id}`).expect(404);
  await bob
    .patch(`/api/tasks/${id}`)
    .set("Origin", origin)
    .send({ completed: true })
    .expect(404);
  await bob.delete(`/api/tasks/${id}`).set("Origin", origin).expect(404);
  const bobsTasks = await bob.get("/api/tasks").expect(200);
  assert.equal(bobsTasks.body.total, 0);
  await alice
    .patch(`/api/tasks/${id}`)
    .set("Origin", "https://evil.example")
    .send({ completed: true })
    .expect(403);
  await alice
    .patch(`/api/tasks/${id}`)
    .set("Origin", origin)
    .send({ completed: "true" })
    .expect(400);
  await alice
    .patch(`/api/tasks/${id}`)
    .set("Origin", origin)
    .send({})
    .expect(400);
  const edited = await alice
    .patch(`/api/tasks/${id}`)
    .set("Origin", origin)
    .send({ completed: true, description: "Practiced" })
    .expect(200);
  assert.equal(edited.body.task.title, "Learn C++");
  assert.equal(edited.body.task.priority, "high");
  assert.equal(edited.body.task.completed, true);
  await User.updateOne(
    { email: credentials.email },
    { $set: { role: "admin" } },
  );
  const users = await alice.get("/api/admin/users").expect(200);
  assert.equal(users.body.total, 2);
  assert.equal(users.body.users[0].passwordHash, undefined);
  const allTasks = await alice.get("/api/admin/tasks").expect(200);
  assert.equal(allTasks.body.total, 3);
  assert.equal(allTasks.body.tasks[0].owner.email, credentials.email);
  await alice.delete(`/api/tasks/${id}`).set("Origin", origin).expect(204);
  await alice.get(`/api/tasks/${id}`).expect(404);
  await alice.post("/api/auth/logout").set("Origin", origin).expect(200);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", cookie.split(";")[0])
    .expect(401);
});
