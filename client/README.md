# Frontend guide

Next.js App Router + React + TypeScript, with plain CSS and native forms. No UI kit, Redux, or authentication package is required.

| File | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Root HTML layout, global CSS, metadata; Server Component |
| `src/app/page.tsx` | Session check, task list, filters, stats, role-aware navigation |
| `src/components/AuthForm.tsx` | Register/login form with error feedback |
| `src/components/TaskForm.tsx` | Reusable create/edit form |
| `src/components/AdminPanel.tsx` | Read-only paginated users/tasks overview |
| `src/lib/api.ts` | Shared API fetch wrapper, response types, ApiError |
| `src/app/globals.css` | Responsive visual design, focus and form styles |

## Packages

- `next`: file-based routes, build tooling, development server, React framework.
- `react` / `react-dom`: components, state, effects, rendering.
- `typescript`: compile-time checking.
- `@types/node`, `@types/react`, `@types/react-dom`: type definitions.
- Root `concurrently`: starts frontend and backend together; not shipped in browser code.

## Why `"use client"`?

Forms, click handlers, browser fetches, useState and useEffect need Client Components. The root layout remains a Server Component. A Client Component can still be prerendered by Next; the directive describes the client boundary, not a claim that no HTML is generated on the server.

This project deliberately fetches protected data in the browser after mounting. Express validates the HttpOnly cookie. A real SSR implementation would need deliberate cookie forwarding from Next to Express; calling `/auth/me` on the server does not automatically forward the browser's cookies.

## State and requests

`user` holds a public profile, not a token. `editing` determines whether TaskForm creates or patches a task. `filters` is a URL query string, `page` is the current page, and `revision` triggers a refetch after mutation. Stats count all your tasks; the list count follows filters.

Effects use an `active` flag so an older response cannot overwrite current state after filters change or the component unmounts. This ignores stale results; it does not cancel their HTTP requests. AbortController is an extension exercise.

Forms use FormData to keep field management simple. API validation is authoritative. The shared fetch helper includes `credentials: 'include'`; this sends cookies and accepts Set-Cookie across the local ports. JavaScript cannot read the HttpOnly token.

Dates from the date-only form become midnight UTC. The UI also displays them in UTC to avoid a date shifting across timezones. A date-only task becomes overdue after that midnight. If you want end-of-day deadlines in a user's timezone, add timezone-aware conversion as a separate feature.

Errors and loading states are visible; deletions require confirmation; checkbox and form labels support keyboard/screen-reader use. Styles adapt to small screens. No external font or image service is required.
