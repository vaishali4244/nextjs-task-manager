# 5. Test and troubleshoot

## Automated checks

From the root:

```bash
npm ci
npm run typecheck
npm run build
npm test
# Or only database-independent tests:
npm run test:unit -w server
```

The API integration test uses Supertest and mongodb-memory-server. It downloads a MongoDB binary on the first run, starts a disposable local database, and removes it when finished. No Atlas credentials are required, and your real Atlas collections are never used by this test.

The test covers register/login, duplicate emails, unknown role rejection, cookie flags, anonymous denial, CRUD, cross-user isolation, literal regex search, completion/priority/tag/date/overdue filters, malformed input, pagination, aggregation, admin authorization, and old-cookie rejection after logout.

A build confirms that the applications compile; it does not prove that your Atlas credentials or firewall are correct. Check the supplied `VERIFICATION.md` for what was actually run in the creation environment.

## Manual browser checks

1. Start both apps and register Alice. Login and reload: the session survives.
2. Create a high-priority task with tags, then edit its description and due date.
3. Mark it finished. Filter finished tasks. Mark it pending again.
4. Create enough tasks to test pagination. Delete the last task on the last page.
5. Search for punctuation such as `C++`, then clear filters.
6. Use another browser/private window for Bob. Bob sees none of Alice's tasks.
7. Promote Alice using the admin command, reload, and inspect both admin tables.
8. Log out. Browser Back/reload must not grant access to protected API data.
9. Inspect DevTools Network for status codes and Application → Cookies for HttpOnly.
10. Try keyboard-only forms and a narrow mobile viewport.

## Common problems

| Symptom | Check |
| --- | --- |
| Startup reports invalid JWT_SECRET | Generate a real random secret and replace the example |
| Database connection fails | Read the `MongoDB error` detail printed at startup. For `mongodb://127.0.0.1:27017/...`, confirm MongoDB is installed and running locally. For Atlas (`mongodb+srv://...`), verify the cluster hostname, database username/password (percent-encode special characters), database user's permissions, network access IP allowlist, and DNS/network access. Never share `.env` or an unredacted connection string. |
| `querySrv ENOTFOUND` | Wrong cluster hostname, DNS/network restrictions, or paused/deleted cluster |
| Port 3000 or 4000 is occupied | Stop the old process or change both related configurations consistently |
| Browser shows API connection error | Confirm Express is running and `/api/health` responds |
| 403 Untrusted or missing Origin | Browser URL must equal CLIENT_ORIGIN; include Origin in curl/Postman |
| Login succeeds but next request is 401 | Use localhost consistently; check credentials:include and cookie policy; avoid Secure cookies over local HTTP |
| Changes to .env do nothing | Restart backend and frontend; rebuild for changed NEXT_PUBLIC values |
| Cannot see another user's tasks | Expected for personal endpoints; use Admin overview with admin role |
| `/tasks/stats` returns invalid ID | Keep the named `/stats` route before `/:id` |
| Validation rejects boolean | JSON uses true/false; query string uses 'true'/'false'; not 'yes' or '1' |
| 429 after repeated login tests | Auth limit is 30 attempts per 15 min per IP; wait or restart your local API |
| `npm ci` complains about lock mismatch after edits | After deliberately editing dependencies, run npm install to update lockfile |
| Test binary cannot download or local process cannot start | Run on an unrestricted local machine; check MongoDB binary platform prerequisites |
| PowerShell blocks npm.ps1 | Use npm.cmd or an appropriate local execution policy according to your machine's rules |
| Windows curl quoting differs | Use curl.exe, Git Bash, or Postman; keep JSON and Origin headers |

## Safe learning workflow

Use a dedicated learning database. Keep `.env` and cookies out of Git; `.env.example` contains only placeholders. Use separate accounts to test roles and ownership. Read the query before running a practice `updateMany` or `deleteMany` command. When implementing a feature, trace one request through form, API wrapper, route, validation, controller and model before adding more abstraction.
