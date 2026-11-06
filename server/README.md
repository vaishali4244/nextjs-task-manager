# Backend guide

Start with the root README for installation and Atlas setup. This folder runs an independent Node.js API using Express 5 and TypeScript.

## Files to read

| Folder/file | Responsibility |
| --- | --- |
| `src/server.ts` | Connect MongoDB, start HTTP server, shut down gracefully |
| `src/app.ts` | Middleware order, routes, central error handler |
| `src/config/env.ts` | Read `.env`; reject missing/invalid settings |
| `src/routes/` | Map HTTP methods and paths to controller functions |
| `src/controllers/` | Validate input, execute queries, send responses |
| `src/models/` | Mongoose schemas and indexes for User, Task, Session |
| `src/validation/schemas.ts` | Zod request validation and allowed fields |
| `src/middleware/auth.ts` | JWT/session verification and admin checks |
| `src/utils/taskQuery.ts` | Convert validated filters into a MongoDB query |
| `src/types/express.d.ts` | Extend Express Request with typed auth data |
| `src/scripts/promote-admin.ts` | Trusted local admin provisioning |
| `tests/api.test.ts` | HTTP + real temporary MongoDB integration test |

This is an MVC-style split: models store data rules, controllers handle requests, and Next.js provides the view. We do not add a service/repository abstraction until business logic needs one.

## Every package and why it exists

| Package | Use |
| --- | --- |
| express | Routing, middleware, HTTP request/response handling |
| mongoose | Typed document schemas, model methods, MongoDB connection |
| zod | Runtime validation; TypeScript alone cannot validate network input |
| dotenv | Loads the server `.env` from this workspace's working directory |
| bcryptjs | Hash and compare passwords; bcrypt cost 12 |
| jsonwebtoken | Sign and verify one-hour HS256 JWTs |
| cookie-parser | Parse incoming Cookie headers into `req.cookies` |
| cors | Allow the configured frontend to read credentialed responses |
| helmet | Set defensive HTTP headers on API responses |
| express-rate-limit | In-memory general and login/register request limits |
| typescript | Static checking and backend compilation |
| tsx | Execute TypeScript in development, tests, and scripts |
| @types/* | Type declarations for packages without bundled types |
| supertest | Make HTTP requests to the app in tests without a fixed port |
| mongodb-memory-server | Run an isolated temporary MongoDB process for tests |

The tests never need your Atlas URI: they override it and connect to the temporary process. A MongoDB binary download is required on the first test run.

## Important TypeScript detail

Source imports end in `.js`, even though source files end in `.ts`. With NodeNext compilation, emitted files are JavaScript and Node requires the runtime extension. `tsx` resolves these source imports during development.

`req.auth!` uses a non-null assertion because these controllers are mounted behind `requireAuth`. It does not perform a runtime check itself. Do not mount these controllers publicly.

Run backend-only commands from the root with `npm run dev -w server` or from this folder with `npm run dev`. Starting `node server/dist/server.js` from the root without specifying the environment will not load `server/.env`; prefer the workspace scripts.
