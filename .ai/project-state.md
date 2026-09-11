# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 2 — SOCIAL CONNECTION (Meta/Instagram+Facebook OAuth scaffolding done; YouTube next)

## Current Sprint

Phase 2: Instagram + Facebook OAuth (done) → YouTube OAuth → metrics ingestion + sync scheduler.

## Completed

- **Phase 0 (foundation) + Phase 1 (auth, AI client, onboarding interview + creator profile):**
  see git history / earlier `.ai/` state for full detail — all done, tested, pushed.
- **`src/modules/integrations`:** official-OAuth-only social account connection (Part 25/45).
  - `types.ts` — `Platform` (`instagram`/`facebook`/`youtube`), `ProviderAdapter` interface
    (`buildAuthorizationUrl`/`exchangeCode`/`discoverAccounts`) that `service.ts` orchestrates
    against without knowing which provider it's talking to (D-012).
  - `meta.ts` — Instagram + Facebook share ONE Meta app/OAuth flow (D-011): Instagram has no
    separate OAuth, IG Business accounts are discovered via their linked Facebook Page. Two-hop
    token exchange (short-lived → long-lived, ~60 day). Injectable `fetch` for testing.
  - `service.ts` — `initiateConnection` (signs OAuth CSRF state via `src/lib/signed-token.ts`),
    `completeConnection` (verifies state, exchanges code, encrypts the token via
    `src/lib/crypto.ts` AES-256-GCM before it ever reaches the DB, upserts one `SocialAccount` row
    per discovered account, audit-logs each), `disconnectAccount` (ownership-checked, Part 52).
  - New shared `src/lib/` infra: `crypto.ts` (encrypt/decrypt secrets), `signed-token.ts` (generic
    signed short-lived tokens — used for OAuth state, reusable elsewhere later).
  - New Prisma models (migration `20260911081710_social_connections`): `SocialAccount`,
    `PlatformMetric` (schema only — ingestion that writes real rows is a separate later task).
  - Routes: `GET /api/integrations` (list, never returns tokens), `GET
/api/integrations/[platform]/start` (redirect to consent screen), `GET
/api/integrations/[platform]/callback` (completes the connection, redirects home),
    `DELETE /api/integrations/accounts/[accountId]` (disconnect).
  - 21 new tests: Meta adapter (mocked `fetch` — URL construction, two-hop token exchange, Page/IG
    discovery filtering, Graph API error handling), service layer (mocked adapter + real DB — state
    verification incl. cross-user rejection, token encryption round-trip, audit logging, ownership),
    HTTP route wiring (auth-required checks, empty list, the MISSING_CREDENTIALS error path).
  - Verified live via `npm run dev`: health, auth-required 401s, empty account list, and — since no
    Meta app is registered here — the clear "META_APP_ID / META_APP_SECRET are not set" error, all
    confirmed through the real running server.
  - **NOT live-verified against a real Meta app.** No `META_APP_ID`/`META_APP_SECRET` configured.
    `meta.ts`'s Graph API version and exact scopes are flagged in-code as needing a check against
    Meta's current docs before this runs for real (same honesty standard as modules/ai, D-013).
  - YouTube (Google OAuth) is NOT built. `getAdapter("youtube")` throws a clear "not connectable
    yet" error rather than pretending. This is the next task.
- **Testing:** 80 tests across 17 files, run 3x for determinism every time. `npm run build`
  succeeds; all 12 API routes register correctly, including the `accounts/[accountId]` nesting
  needed to avoid a Next.js dynamic-route-name conflict with `[platform]`.

## In Progress

(none — Instagram/Facebook OAuth scaffolding fully done)

## Next

`src/modules/integrations/google.ts`: YouTube OAuth (Google), mirroring `meta.ts`'s shape against
the same `ProviderAdapter` interface — Google's OAuth 2.0 authorization endpoint, token exchange
(with a real refresh token, unlike Meta's long-lived-token approach), and channel discovery via the
YouTube Data API. Wire it into `service.ts`'s `getAdapter()`. Needs `GOOGLE_CLIENT_ID`/
`GOOGLE_CLIENT_SECRET` to live-verify (same gap as Meta — build and mock-test regardless).

After all three platforms connect: metrics ingestion (the part that actually calls each platform's
insights/analytics API and writes `PlatformMetric` rows) + a sync scheduler — this is real,
substantial work of its own, deliberately not bundled into the OAuth scaffolding task.

## Known Issues

None open. See `.ai/known-issues.md` for resolved history (BUG #001 git push access, BUG #002
Vitest env loading / test cross-contamination).

**Still true, not bugs — pending user action:**

- `ANTHROPIC_API_KEY` unset. modules/ai and modules/creator are fully mock-tested but have never
  made a real Claude call. The user has said they'll add it; check `.env` before assuming it's
  still missing in a future session.
- `META_APP_ID`/`META_APP_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unset. Needed to
  live-verify modules/integrations; the user needs to register apps with Meta and Google first
  (Part 67 — manual developer approval, cannot be done by the agent).

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (80/80, run 3x for determinism),
`npm run build`, plus a live `npm run dev` smoke test of every integrations route (auth checks,
empty list, missing-credentials error) and, earlier in the session, of every auth route.

## Git

Branch: main
Last commit: `e44519c` "docs: record creator module push success"
(integrations module is implemented and tested but NOT YET committed — see Next Recommended Action)
Last push: SUCCESS (as of `e44519c`)
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Commit and push the integrations module (`src/modules/integrations/**`, `src/app/api/integrations/**`,
   `src/lib/crypto.ts` + `src/lib/signed-token.ts` (+ tests), `prisma/schema.prisma` +
   `prisma/migrations/20260911081710_social_connections/`).
2. Build `src/modules/integrations/google.ts` (YouTube) the same way — see "Next" above.
3. Check `.env` for `ANTHROPIC_API_KEY` before assuming it's still missing; if present, run a live
   onboarding smoke test (`npm run dev`, sign up, `POST /api/creator/onboarding`, a few
   `PATCH` turns) to finally verify modules/ai + modules/creator end to end.
