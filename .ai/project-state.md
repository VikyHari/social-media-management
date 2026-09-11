# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 1 — CREATOR INTELLIGENCE (auth done, AI client module done, onboarding interview next)

## Current Sprint

Phase 1: authentication (done) → AI client module (done) → creator onboarding interview → creator
profile.

## Completed

- **Phase 0 (foundation):** Next.js 16 + TS + Tailwind v4 + ESLint 9 + Prettier scaffold; PostgreSQL
  16 via Docker (port 5440) + Prisma 7; Zod-validated env; GitHub Actions CI; `.ai/` project memory;
  pushed to `origin/main`.
- **`src/modules/auth`:** signup, login, logout, session validation. bcrypt hashing, HMAC-hashed
  opaque session tokens, DB sessions (30-day expiry), httpOnly/Lax cookie, rate limiting, audit log.
  Routes: `POST /api/auth/{signup,login,logout}`, `GET /api/auth/me`. 36 tests; verified live via
  `npm run dev` (full signup/login/logout/me flow, cookie flags, audit rows all confirmed).
- **`src/modules/ai`:** the only module allowed to call `@anthropic-ai/sdk` directly (D-005).
  - `client.ts` — lazy Anthropic client singleton (mirrors `src/lib/db.ts`); throws a clear
    `AiError("MISSING_API_KEY")` at first real use if `ANTHROPIC_API_KEY` is unset (it is, in this
    dev environment — see Known Issues below).
  - `structured.ts` — `generateStructured<T>()`: converts a Zod schema to a JSON schema
    (`z.toJSONSchema`), forces Claude to call a matching tool, Zod-validates the result, and does
    one corrective retry (via a `tool_result` block explaining what was wrong) before throwing
    `AiError("INVALID_OUTPUT")`. This is how every future module must get structured data out of
    Claude — never parse free-form text as JSON (D-009).
  - `pricing.ts` — `estimateCostUsd()` returns `null` until real per-model USD rates are filled in;
    no invented numbers presented as fact (D-010). Token counts are always the real API numbers.
  - `conversation.ts`/`repository.ts` — generic multi-turn conversation storage (`AiConversation`,
    `AiMessage`), tagged by `purpose` (e.g. "onboarding"), reusable by any AI feature.
  - `usage.ts` — logs every call to `AiUsageLog` (tokens, latency, cost estimate); never throws.
  - New Prisma models (migration `20260911065727_ai_engine`): `AiConversation`, `AiMessage`,
    `AiUsageLog`. `ai_memory` (Part 62, long-term creator understanding) deliberately not built yet
    — belongs with `modules/creator`, which will be its first writer/reader.
  - 9 new tests (pricing unit test; structured-output unit tests against a mocked client covering
    success/retry-then-success/fail-twice/no-tool-call/transport-error; conversation + usage
    integration tests against the real DB) — 45 tests total in the project, run 3x for determinism.
  - No API routes yet — this is infrastructure for `modules/creator` (next) to consume.
  - **Not live-tested against the real Claude API** — no `ANTHROPIC_API_KEY` configured in this
    environment. Unit tests use a mocked client instead; see Known Issues.

## In Progress

(none — AI client module fully done)

## Next

`src/modules/creator`: adaptive onboarding interview (uses `modules/ai`'s `generateStructured` +
`conversation` APIs, `purpose: "onboarding"`) that progressively asks about niche, interests,
skills, personality, content style, audience, goals, platforms, equipment, budget, time,
experience, existing content, competitors, language, monetization (Part 23) — the AI should choose
follow-ups dynamically, not ask a fixed script. Produces a structured `CreatorProfile` (Part 24) +
`Goal` records. New Prisma models needed: `CreatorProfile`, `Goal`. Requires a logged-in user
(`modules/auth`). Route(s) to start/continue/finish the interview under `/api/creator/onboarding`.

## Known Issues

**`ANTHROPIC_API_KEY` is not set.** AI features are built and unit-tested (mocked client) but have
never made a real call to Claude. The onboarding interview (next task) will not actually function
end-to-end without a real key. Not logged as a bug — this is expected/pending user action, not a
defect. See "Next Recommended Action".

None open in `.ai/known-issues.md`. See that file for resolved history (BUG #001 git push access,
BUG #002 Vitest env loading / test cross-contamination).

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (45/45, run 3x for determinism),
`npm run build`. AI module verified only via mocked-client unit tests, not a live API call.

## Git

Branch: main
Last commit: `6705c17` "feat: add AI client module (Claude wrapper, structured output, usage log)"
Last push: SUCCESS — origin/main up to date with local main.
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Get an `ANTHROPIC_API_KEY` into `.env` (never commit it) so `modules/ai` — and the onboarding
   interview about to be built on it — can be live-verified, not just mocked-tested. Not blocking:
   `src/modules/creator` can be built and tested the same way `modules/ai` was (mocked client), and
   switch to a live smoke test once a key is available.
2. Start `src/modules/creator` (onboarding interview + creator profile). See `.ai/current-task.md`.
