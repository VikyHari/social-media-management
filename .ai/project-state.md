# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 1 — CREATOR INTELLIGENCE (auth, AI client, onboarding interview + profile all done)

## Current Sprint

Phase 1 core is functionally complete. Remaining Phase 1 items (niche/audience analysis as
dedicated features) are lower priority than starting Phase 2 (social connection) — see Next.

## Completed

- **Phase 0 (foundation):** Next.js 16 + TS + Tailwind v4 + ESLint 9 + Prettier scaffold; PostgreSQL
  16 via Docker (port 5440) + Prisma 7; Zod-validated env; GitHub Actions CI; `.ai/` project memory.
- **`src/modules/auth`:** signup, login, logout, session validation. bcrypt hashing, HMAC-hashed
  opaque session tokens, DB sessions (30-day expiry), httpOnly/Lax cookie, rate limiting, audit log.
  Routes: `POST /api/auth/{signup,login,logout}`, `GET /api/auth/me`.
- **`src/modules/ai`:** the only module allowed to call `@anthropic-ai/sdk` directly (D-005).
  `generateStructured<T>()` forces a Zod-schema-shaped tool call, validates, retries once on
  failure (D-009). `pricing.ts` never fabricates cost numbers — returns null until real rates are
  configured (D-010). Generic `AiConversation`/`AiMessage` storage (tagged by `purpose`) and
  `AiUsageLog` usage tracking, reusable by any feature that talks to Claude.
- **`src/modules/creator`:** adaptive onboarding interview (Part 23) built on `modules/ai`.
  - `interview.ts` — each turn forces `interviewTurnSchema` (next question + a
    `readyToExtractProfile` flag the model sets itself); once ready, a second forced-tool call
    extracts a full `creatorProfileExtractionSchema` (Part 24 fields + 1-8 goals) from the whole
    transcript. Ownership is checked on every continue call (a conversation only answers to the
    user who started it). Re-running onboarding **upserts** the existing profile rather than
    duplicating it.
  - New Prisma models (migration `20260911075752_creator_intelligence`): `CreatorProfile` (1:1
    with User, linked back to its source `AiConversation` for provenance), `Goal`.
  - Routes: `POST /api/creator/onboarding` (start), `PATCH /api/creator/onboarding` (continue),
    `GET /api/creator/profile`.
  - The interview's system prompt already does a light version of Part 41 ("AI should challenge
    the user") — it's told to push back on scattered niches or unrealistic goals rather than just
    agreeing. A dedicated "niche analysis" / "audience analysis" feature is NOT built (see Next).
- **Testing:** 53 tests across 12 files (unit + real-DB integration + HTTP route tests), run 3x for
  determinism every time. `npm run build` succeeds; all new routes register correctly.
- **Fixed BUG #002** (Vitest env loading / cross-test-file `process.env` pollution) — see
  `.ai/known-issues.md`.

## In Progress

(none — creator onboarding module fully done)

## Next

Two independent directions, pick by priority (Part 17: core user journey > nice-to-have):

1. **Phase 2 — Social connection** (Instagram/Facebook/YouTube OAuth + metrics ingestion). This is
   the next major capability the product needs — analytics/content phases depend on real account
   data existing. Needs `META_APP_ID`/`META_APP_SECRET` (Instagram+Facebook, one Meta app) and
   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (YouTube) — all currently blank in `.env`. Setting up
   each requires the user to register a developer app on Meta/Google (Part 67: platform requires
   manual developer approval) — this **will need to be done by the user**, not something I can
   provision. I can build the OAuth flow, token storage (encrypted, `TOKEN_ENCRYPTION_KEY` already
   provisioned since Phase 0), and ingestion scaffolding without real credentials, the same way
   `modules/ai` was built and tested without a real Claude key — but nothing will actually connect
   until real app credentials exist.
2. **Live-verify `modules/ai` + `modules/creator`** once `ANTHROPIC_API_KEY` is added to `.env`.
   Everything is unit-tested against a mocked client; a real end-to-end onboarding run has never
   happened. Cheap to do (one `.env` line + a manual `npm run dev` smoke test) whenever a key is
   available — does not block other work.

## Known Issues

None open. See `.ai/known-issues.md` for resolved history (BUG #001 git push access, BUG #002
Vitest env loading / test cross-contamination).

**Still true, not a bug:** `ANTHROPIC_API_KEY` is unset — `modules/ai` and `modules/creator` are
built and thoroughly unit/integration-tested with a mocked Claude client, but have never made a
real API call.

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (53/53, run 3x for determinism),
`npm run build`. Docker Desktop was not running at the start of this session (needed a manual
restart before migrations/DB tests could run) — if a future session hits DB connection errors,
check `docker compose ps` first.

## Git

Branch: main
Last commit: `605ebcd` "feat: add creator onboarding interview and structured profile"
Last push: SUCCESS — origin/main up to date with local main.
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Commit and push the creator onboarding module (`src/modules/creator/**`,
   `src/app/api/creator/**` + tests, `prisma/schema.prisma` +
   `prisma/migrations/20260911075752_creator_intelligence/`).
2. Decide between the two "Next" directions above, or do both in parallel: start Phase 2 (OAuth
   scaffolding, no real credentials needed yet) while asking the user for an `ANTHROPIC_API_KEY`
   and, when ready to actually build Phase 2 end-to-end, Meta + Google OAuth app credentials.
