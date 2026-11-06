# 4. JWT, cookies, and authorization

## Registration

The API validates name/email/password, normalizes email, hashes the password with bcrypt cost 12, and saves only `passwordHash`. The password length limit respects bcrypt's 72-byte input limit, including multibyte characters. Hashing is one-way verification, not reversible encryption. Do not log plaintext passwords, cookies, JWTs, or connection strings.

Registration always assigns `role:'user'`. A strict schema rejects attempts to supply `role:'admin'`. A trusted local script is the only admin provisioning mechanism included here.

## Login

1. Validate email/password.
2. Read the account with its normally hidden password hash.
3. Use `bcrypt.compare` to verify it.
4. Create a random session ID and store it with user and expiry in MongoDB.
5. Sign a JWT containing `sub` (user ID), `jti` (session ID), expiry, issuer and audience.
6. Set it as an `access_token` cookie. Return the public profile only.

JWTs are signed, **not encrypted**. Anyone holding a JWT can decode its payload; do not put secrets there. Signature verification checks that the payload has not been altered, and validation checks its expiry, algorithm, issuer, and audience.

## Token storage

| Storage | JavaScript can read token? | Automatically sent? | Relevant tradeoff |
| --- | --- | --- | --- |
| localStorage | Yes | No; app adds header | Persists; an XSS bug can steal it |
| sessionStorage | Yes | No | Tab-scoped; still accessible to XSS |
| React memory | Yes | No | Lost on reload; still accessible to running malicious JS |
| HttpOnly cookie (used here) | No | Yes, per cookie rules | Reduces direct token theft; requires CSRF defenses |

HttpOnly does not make XSS harmless: malicious scripts can still cause requests from the user's page. The UI relies on normal React escaping and does not inject user HTML.

Cookie options:

- **HttpOnly:** browser JavaScript cannot read the value.
- **SameSite=Lax:** restricts many cross-site cookie sends.
- **Secure in production:** cookie goes over HTTPS.
- **Path=/** and no Domain: host-only cookie.
- **Max-Age one hour:** browser persistence matches JWT/session expiry.

Cookies are host-scoped, not port-scoped. `localhost:3000` and `localhost:4000` are different origins but are same-site. The frontend therefore uses `credentials:'include'` and the API allows the exact frontend origin with credentials.

## CSRF versus CORS

CORS controls which origins browser JavaScript can read responses from; it is not an authentication or complete CSRF mechanism. This API additionally **rejects every mutating request whose Origin is absent or differs from CLIENT_ORIGIN**. That includes login and registration, preventing login-CSRF too. No GET endpoint changes application data.

Origin is browser-controlled. curl or Postman can set it manually, so it is not proof of identity: protected actions still require authentication. This strict browser-oriented policy is sufficient for the intended local setup; clients that omit Origin need an explicitly designed alternative, not removal of the check.

## Protected requests

`requireAuth` verifies the JWT, checks the matching unexpired Session record, and loads the user. The database role is authoritative, so role changes apply immediately. A regular user cannot access `/admin/*`, even by typing the URL or calling fetch manually.

Personal task queries always include `owner:req.auth.id`. Admin access intentionally does not override ownership on those routes. The separate admin endpoints expose read-only cross-user views.

## Logout and expiration

Logout deletes the matching session and clears the cookie using matching options. Even if somebody replays the previously valid JWT, it fails because its session no longer exists. Session documents have a TTL index for cleanup, but TTL removal is not instantaneous: middleware explicitly checks `expiresAt > now` too.

This design is **stateful JWT authentication**, not a stateless JWT system. It trades an extra database check for immediate revocation. It could also have been built with an opaque session cookie; the JWT is included to teach signing/verification and claims.

Other browsers' sessions remain active. Re-login in the same browser revokes its prior valid session. There is no refresh endpoint: after one hour the UI returns to login when a protected request gets 401.

## How to extend to refresh tokens (not implemented)

A later version could use short-lived access JWTs and a longer-lived random refresh token in a separate HttpOnly cookie. Store a hash of the refresh token, rotate it atomically on every refresh, detect reuse, revoke its token family, and synchronize concurrent refresh calls on the client. Logout should revoke refresh credentials as well as active sessions. Add expiry/replay/concurrency tests. Avoid simply issuing a never-expiring JWT.

## Other included defenses

- Strict Zod schemas reject extra fields, incorrect types, invalid IDs and oversized limits.
- Query values are converted into an explicit allowlist; raw request objects never become MongoDB filters.
- Literal regex escaping avoids accepting user-supplied regex programs.
- Password hashes are excluded from normal queries and public response shaping.
- A unique email index handles registration races.
- API body size is limited to 20 KB; rate limits reduce casual abuse.
- Helmet sets API headers. This is not a complete frontend CSP configuration.
- Unexpected server errors return generic messages; the code does not return stacks.

The invalid-login message is generic, but this learning version does not equalize timing between nonexistent accounts and wrong passwords. Rate limits use process memory and reset on restart; distributed deployments need shared storage.

## Before an internet deployment

Use HTTPS and `NODE_ENV=production` for Express. Keep the browser frontend and API on the same site (for example app.example.com and api.example.com), set exact URLs, and rebuild the frontend. Unrelated hostnames may make SameSite=Lax cookies unavailable: use a deliberate same-site reverse proxy or redesign cross-site cookie/CSRF handling. Do not casually switch to SameSite=None.

If behind a reverse proxy, configure Express `trust proxy` to the **actual trusted proxy topology** before relying on client-IP rate limiting. Never set it blindly. Add controlled index migrations, monitoring, backups, secrets management, a shared rate-limit store, and dependency update checks. Evaluate account verification/reset, stronger auth, audit logging and your access model before handling real sensitive data.

No hosting provider, paid service, production domain, or production security audit is included in this starter.
