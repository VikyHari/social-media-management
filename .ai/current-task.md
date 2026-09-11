# CURRENT TASK

## Task

Phase 1, step 1: authentication (`src/modules/auth`).

## Type

New feature

## Target module

`src/modules/auth` (new). Touches `prisma/schema.prisma` (User/Session already exist), `src/lib/`.

## Relevant files

- prisma/schema.prisma (User, Session models already defined — reuse, don't redesign)
- src/lib/db.ts, src/lib/env.ts (existing — reuse)
- src/modules/auth/service.ts, repository.ts, session.ts (new)
- src/app/api/auth/signup/route.ts, src/app/api/auth/login/route.ts, src/app/api/auth/logout/route.ts (new)

## Constraints

- Passwords hashed with bcrypt (or argon2), never stored/logged in plain text.
- Session token: random 32+ byte value; only its hash stored in `Session.tokenHash` (already modeled).
- Cookie: httpOnly, SameSite=Lax, Secure in production.
- Zod-validate all request input.
- This is app login (email/password) — separate from Instagram/Facebook/YouTube OAuth (Phase 2),
  which connects social accounts, not app identity. Do not conflate the two.

## Expected result

A user can sign up, log in, hit an authenticated route, and log out; sessions persist in Postgres
and expire. Lint/typecheck/tests/build pass.

## Validation

`npm run lint && npm run typecheck && npm test && npm run build`, plus new unit/integration tests
for signup/login/logout and session expiry.
