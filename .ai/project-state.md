# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 1 — CREATOR INTELLIGENCE (auth done, AI client module next)

## Current Sprint

Phase 1: authentication (done) → AI client module → creator onboarding interview → creator profile.

## Completed

- **Phase 0 (foundation):** Next.js 16 + TS + Tailwind v4 + ESLint 9 + Prettier scaffold; PostgreSQL
  16 via Docker (port 5440) + Prisma 7; Zod-validated env; GitHub Actions CI; `.ai/` project memory;
  pushed to `origin/main`.
- **Phase 1 — `src/modules/auth`:** signup, login, logout, session validation.
  - bcrypt password hashing (`password.ts`, 12 salt rounds, 72-char cap to match bcrypt's limit)
  - Opaque random session tokens; only an HMAC (keyed by `SESSION_SECRET`) is stored as
    `Session.tokenHash` (`tokens.ts`) — a leaked DB alone can't mint valid cookies
  - DB-backed sessions, 30-day expiry, httpOnly/SameSite=Lax/Secure-in-prod cookie (`cookie.ts`)
  - Zod input validation (`schemas.ts`); same generic error for wrong-password vs. no-such-user
    (no email enumeration via login)
  - Audit log entries for signup/login/logout (`src/lib/audit.ts`, reusable by later modules)
  - Per-IP rate limiting on signup/login (`src/lib/rate-limit.ts`, in-memory — see limitation below)
  - Routes: `POST /api/auth/{signup,login,logout}`, `GET /api/auth/me`
  - Shared helpers added to `src/lib/`: `api.ts` (parseJsonBody/apiErrorResponse), `rate-limit.ts`,
    `audit.ts` — all reusable by every future module, not auth-specific
  - Tests: 36 passing across 7 files — unit tests (password, tokens, rate-limit, api helper) +
    integration tests against the real local Postgres (service layer + actual HTTP route handlers)
  - Verified live via `npm run dev`: signup(201) → me(200) → logout(200) → me(401) → login(200) →
    duplicate signup(409), cookie attributes confirmed (httpOnly, 30d, Secure=false in dev), audit
    log rows confirmed (`auth.signup`, `auth.login`, `auth.logout`)
  - No Prisma migration needed — User/Session models already existed from Phase 0

## In Progress

(none — auth module fully done)

## Next

1. `src/modules/ai`: Claude client wrapper (`@anthropic-ai/sdk`), a structured-output helper
   (prompt → Zod-validated typed result), usage/cost logging (`ai_conversations`/`ai_memory`
   tables — new Prisma models needed). No other module should call the SDK directly.
2. `src/modules/creator`: adaptive onboarding interview (uses modules/ai) + structured creator
   profile (niche, audience, goals, platforms, content style, equipment, budget, time) +
   `creator_profiles`/`goals` Prisma models. Requires a logged-in user (modules/auth).

## Known Issues

None open. See `.ai/known-issues.md` for resolved history (BUG #001 git push access, BUG #002
Vitest env loading / test cross-contamination).

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (36/36, run 3x for determinism),
`npm run build`, and a live end-to-end smoke test of every auth route via `npm run dev` + curl.

## Git

Branch: main
Last commit: `96effff` "docs: close Phase 0, resolve BUG #001, point Phase 1 at auth module"
(auth module work is implemented and tested but NOT YET committed — see Next Recommended Action)
Last push: SUCCESS (as of `96effff`)
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

Commit and push the auth module (`src/modules/auth/**`, `src/app/api/auth/**`,
`src/lib/{api,rate-limit,audit}.ts` + tests, `vitest.setup.ts`, `vitest.config.ts`), then start
`src/modules/ai` (Claude client wrapper) — every subsequent module (creator onboarding, analytics
interpretation, content generation) depends on it existing first.
