# 2. API reference

Base URL: `http://localhost:4000/api`. Bodies are JSON. Protected endpoints require the `access_token` cookie. Every POST/PATCH/DELETE also requires `Origin: http://localhost:3000`; the browser supplies this automatically.

## Endpoints

| Method/path | Access | Request / result |
| --- | --- | --- |
| GET `/health` | Public | `{ status: 'ok' }` |
| POST `/auth/register` | Public | name/email/password; 201 public user; does not log in |
| POST `/auth/login` | Public | email/password; sets cookie; returns public user |
| GET `/auth/me` | Authenticated | Current public user |
| POST `/auth/logout` | Public with Origin | Revoke valid session and clear cookie |
| GET `/tasks` | Authenticated | Own tasks; filters/pagination; `{tasks,total,page,pages}` |
| POST `/tasks` | Authenticated | Create own task; 201 `{task}` |
| GET `/tasks/stats` | Authenticated | `{total,completed,pending,highPriority}` |
| GET `/tasks/:id` | Owner | `{task}` |
| PATCH `/tasks/:id` | Owner | Partial task update; `{task}` |
| DELETE `/tasks/:id` | Owner | 204, no body |
| GET `/admin/users` | Admin | Paginated `{users,total,page,pages}` |
| GET `/admin/tasks` | Admin | All tasks with populated owner; same filters as own list |

`/admin/users` uses page/limit. Other accepted task-filter keys have no effect on users; use only page/limit for that endpoint.

## Task payload

```json
{
  "title": "Practice MongoDB queries",
  "description": "Try find, countDocuments and aggregate",
  "priority": "high",
  "completed": false,
  "dueDate": "2026-12-31T00:00:00.000Z",
  "tags": ["learning", "backend"]
}
```

Only title is required on create. Defaults: empty description/tags, medium priority, false completion, null due date. PATCH accepts any nonempty subset. Send `"dueDate": null` to remove a deadline, `"tags": []` to clear tags. Owner, role, `_id`, and MongoDB operators are never accepted in task bodies.

## List filters (combine with `&`)

| Parameter | Values | Example |
| --- | --- | --- |
| completed | true / false | `completed=true` |
| title | Literal case-insensitive substring, max 120 chars | `title=learn` |
| priority | low / medium / high | `priority=high` |
| tag | One tag, normalized lowercase | `tag=backend` |
| overdue | true / false | `overdue=true` |
| from | ISO UTC timestamp; inclusive due-date minimum | `from=2026-01-01T00:00:00.000Z` |
| to | ISO UTC timestamp; inclusive due-date maximum | `to=2026-12-31T23:59:59.999Z` |
| page | Integer 1–10000; default 1 | `page=2` |
| limit | Integer 1–50; default 10 | `limit=5` |
| sort | createdAt / dueDate / title | `sort=createdAt` |
| order | asc / desc; default desc | `order=desc` |

All filters are combined with AND. `overdue=true` means unfinished with a non-null deadline before the current instant. Therefore `completed=true&overdue=true` correctly returns no matches. `overdue=false` includes finished tasks, no-deadline tasks, and future-deadline tasks. Due-date sorting follows MongoDB ordering, including nulls; title sort is case-sensitive default binary ordering.

An empty list has `total:0`, `pages:0`, and `tasks:[]`. A page beyond the last page also returns an empty array; the UI moves back when a delete empties the last page. `_id` is a stable tiebreaker for equal sort values.

## Runnable curl walkthrough

Use Bash/Git Bash/macOS/Linux terminal for these multiline examples. On Windows PowerShell, use `curl.exe` with equivalent quoting or use Postman. `cookies.txt` is a local secret: do not commit it. Set Origin in Postman too, and enable its cookie jar.

```bash
curl -i http://localhost:4000/api/auth/register \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"name":"Learner","email":"learner@example.com","password":"Learning123!"}'

curl -i -c cookies.txt http://localhost:4000/api/auth/login \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"email":"learner@example.com","password":"Learning123!"}'

curl -b cookies.txt http://localhost:4000/api/auth/me

curl -b cookies.txt http://localhost:4000/api/tasks \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"title":"Learn CRUD","priority":"high","tags":["backend"]}'

curl -b cookies.txt 'http://localhost:4000/api/tasks?completed=false&priority=high&page=1&limit=5'

curl -b cookies.txt --get http://localhost:4000/api/tasks \
  --data-urlencode 'title=C++' --data-urlencode 'sort=title' --data-urlencode 'order=asc'
```

Copy the `_id` returned by create/list and replace `TASK_ID`:

```bash
curl -b cookies.txt http://localhost:4000/api/tasks/TASK_ID

curl -X PATCH -b cookies.txt http://localhost:4000/api/tasks/TASK_ID \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"completed":true}'

curl -b cookies.txt http://localhost:4000/api/tasks/stats

curl -X DELETE -b cookies.txt http://localhost:4000/api/tasks/TASK_ID \
  -H 'Origin: http://localhost:3000'

curl -X POST -b cookies.txt -c cookies.txt http://localhost:4000/api/auth/logout \
  -H 'Origin: http://localhost:3000'
```

`POST /auth/login` returns the profile, not the JWT in JSON. Look at Set-Cookie in the response headers or browser DevTools → Application → Cookies. `document.cookie` cannot read an HttpOnly token.

## Errors

```json
{
  "message": "Validation failed",
  "errors": [{ "field": "title", "message": "Too small: expected string to have >=1 characters" }]
}
```

Exact Zod wording can vary by version. Depend on the status and fields, not the English error sentence. General errors have `{ "message": "..." }`. The API does not return stack traces or password hashes.
