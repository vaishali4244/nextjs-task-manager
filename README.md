# Taskroom — learn full stack by building a task manager

A beginner-friendly, runnable **Next.js + TypeScript frontend and Node.js + Express + MongoDB backend**. Use your own MongoDB Atlas credentials. No paid API, email provider, auth service, or AI subscription is required. Run both applications locally and use an Atlas Free cluster, or a local MongoDB installation.

Start here, then follow the linked guides. This covers a practical core of full stack interviews; no single starter covers every interview topic.

## What you can do

- Register, log in, stay logged in after reload, and log out.
- Create tasks, read lists or a single task, edit details, toggle completion, and delete.
- Set a title, description, priority, optional due date, and up to five tags.
- Filter by finished/pending, literal title search, priority, tag, due-date range, and overdue status.
- Sort, paginate, count matches, and view aggregation-based statistics.
- Use ordinary user and admin roles. An admin can see a paginated overview of all users and tasks; task editing stays owner-only.
- Learn validation, bcrypt password hashing, JWT verification, cookie storage, CSRF defenses, CORS, indexes, ownership checks, and centralized errors.

Due-date range filters are available through the API; the UI exposes the most common filters. Admin is a read-only oversight feature, not a full user-management system.

## 1. Install prerequisites

Use **Node.js 22 or 24**, npm, a code editor, and a MongoDB Atlas account. Dependencies are locked in `package-lock.json`. You do not need a globally installed TypeScript, Next.js, or Express.

```bash
node --version
npm --version
```

Extract the ZIP, open the `task-manager` folder in VS Code, and open its terminal. Run every root command below from the directory containing this README and the root `package.json`.

## 2. Create your MongoDB database

1. Open https://www.mongodb.com/atlas and create a project.
2. Choose the **Free / M0** cluster option. Avoid choosing paid tiers for this tutorial. Atlas may change its setup screens; use its official Free-cluster guide linked below.
3. Under Database Access, create a **database user** with read/write access to the `task_manager` database. This is different from your Atlas website login and different from an application user.
4. Under Network Access, add your current public IP address. If your network changes, update that entry.
5. Choose **Connect → Drivers → Node.js**, and copy the connection string.
6. Insert your database username/password and add `/task_manager` before `?`.
7. Percent-encode special characters in the URI username/password. For example `@` becomes `%40`. Never paste credentials into an online encoder.

Example shape (not working credentials):

```dotenv
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/task_manager?retryWrites=true&w=majority
```

Collections appear after data is written. You do not manually create SQL tables. Alternatively, if you already run local MongoDB, use `mongodb://127.0.0.1:27017/task_manager`.

## 3. Create environment files

macOS/Linux:

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.local.example client/.env.local
```

Generate a secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Edit **server/.env** and replace `MONGODB_URI` and `JWT_SECRET`. Do not use the placeholder secret: startup intentionally rejects it. Keep the default ports and origins for your first run.

| Variable | Location | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | server/.env | Private database connection string |
| `JWT_SECRET` | server/.env | Private signing secret, at least 32 characters; generate randomly |
| `CLIENT_ORIGIN` | server/.env | Exact browser origin, `http://localhost:3000`, with no trailing slash |
| `PORT` | server/.env | Express port, default 4000 |
| `NODE_ENV` | server/.env | `development` locally; enables Secure cookies in production |
| `NEXT_PUBLIC_API_URL` | client/.env.local | Public API base URL, `http://localhost:4000/api` |

`NEXT_PUBLIC_` means readable by browser users and included in the frontend build. **Never** put MongoDB credentials or JWT secrets in a `NEXT_PUBLIC_` variable. Restart after changing environment files; rebuild the frontend after changing its public URL for a production build. `.gitignore` excludes real environment files.

## 4. Install and run

```bash
npm ci
npm run dev
```

`npm ci` installs the exact dependency tree in the lockfile. The root uses npm workspaces, so one install serves both folders. `concurrently` starts both processes.

- Frontend: http://localhost:3000
- API health: http://localhost:4000/api/health

Open the frontend, create an account, then log in. Add a task, edit it, mark it finished, filter finished tasks, and delete it. Use **localhost for both services**, not `localhost` for one and `127.0.0.1` for the other. If port 3000 is occupied, stop that process rather than silently using port 3001: the configured Origin must match.

## 5. Try the roles

Register a second account normally. All registrations become `user`; the public API never accepts an admin role.

To promote an account you own, run this trusted local script from the root:

```bash
npm run admin -- your-email@example.com
```

The script uses the server's `.env` and changes that account's role in MongoDB. Reload the page. The **Admin** tab shows all users and all tasks, with pagination. Server middleware checks the database role on each request, so hiding a button is not the security boundary.

| Capability | User | Admin |
| --- | --- | --- |
| Manage own tasks | Yes | Yes |
| Read another user's task through `/tasks/:id` | No | No |
| Read all users and tasks through `/admin/*` | No | Yes |
| Public signup with admin role | No | No |
| Change other users' roles from the web UI | No | No |

## 6. Learn in this order

1. [Architecture and request walkthrough](docs/01-ARCHITECTURE.md)
2. [API reference and runnable requests](docs/02-API.md)
3. [MongoDB queries and interview explanations](docs/03-QUERIES-AND-INTERVIEWS.md)
4. [Authentication, cookies, JWT, and security](docs/04-AUTH-AND-SECURITY.md)
5. [Testing and troubleshooting](docs/05-TESTING-AND-TROUBLESHOOTING.md)
6. Folder guides: [backend](server/README.md), [frontend](client/README.md)

## Scripts

| Root command | Purpose |
| --- | --- |
| `npm run dev` | Both apps with development reloading |
| `npm run typecheck` | Check frontend/backend TypeScript |
| `npm test` | API integration test using a temporary MongoDB instance |
| `npm run build` | Compile Express and build Next.js |
| `npm run admin -- EMAIL` | Promote an existing account locally |
| `npm run start -w server` | Run built backend (after build) |
| `npm run start -w client` | Run built frontend (separate terminal) |

For a local build smoke test, keep `NODE_ENV=development` in the API environment so HTTP localhost can receive the non-Secure cookie. For an actual internet deployment, use HTTPS, `NODE_ENV=production`, and the deployment notes in the security guide. Hosting is optional and not provisioned by this project.

## Scope and next steps

This is a learning application, not a claim of complete production readiness. It intentionally uses a single one-hour JWT session: when it expires, log in again. No automatic refresh token, email verification, password reset, MFA, file upload, realtime collaboration, or public registration abuse service is included. These are good follow-up exercises after you understand the core flow. The UI uses client-side API calls; this is not a Server Actions/SSR-auth tutorial. Express owns all database and auth operations.

All dependencies are installable without payment. Atlas Free has resource limits; paid hosting is not required to run this project locally. Official setup references consulted:

- https://nextjs.org/docs/app/getting-started/installation
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://expressjs.com/en/guide/error-handling.html
- https://mongoosejs.com/docs/guide.html
