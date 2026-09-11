# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 2 — SOCIAL CONNECTION: OAuth scaffolding DONE for all 3 platforms. Ingestion not started.

## Current Sprint

Phase 2 OAuth (Instagram + Facebook + YouTube) is complete. Metrics ingestion is next but is a
genuinely separate, substantial piece of work — see Next.

## Completed

- **Phase 0 (foundation) + Phase 1 (auth, AI client, onboarding interview + creator profile):**
  all done, tested, pushed. See git history for full detail if needed.
- **`src/modules/integrations`:** official-OAuth-only connection for all three platforms.
  - `meta.ts` — Instagram + Facebook, one Meta app/OAuth flow (D-011). IG accounts discovered via
    linked Facebook Pages. Two-hop token exchange (short-lived → ~60 day long-lived).
  - `google.ts` — YouTube via Google OAuth 2.0. Requests `access_type=offline&prompt=consent` to
    receive a real `refresh_token` (D-014, unlike Meta's re-exchange approach). Discovers the
    creator's own channel via the YouTube Data API.
  - `service.ts` — provider-agnostic orchestration (D-012) via the `ProviderAdapter` interface:
    signs/verifies OAuth CSRF state (`src/lib/signed-token.ts`), encrypts tokens before they reach
    the DB (`src/lib/crypto.ts`, AES-256-GCM), upserts `SocialAccount` rows, audit-logs
    connect/disconnect, enforces ownership on disconnect.
  - Prisma models (migration `20260911081710_social_connections`): `SocialAccount`,
    `PlatformMetric` (schema only — ingestion that writes real rows is the next task).
  - Routes: `GET /api/integrations` (list, never returns tokens), `GET
/api/integrations/[platform]/start` + `.../callback`, `DELETE
/api/integrations/accounts/[accountId]`.
  - 30 tests: both adapters against a mocked `fetch` (URL construction, token exchange incl.
    Google's POST/form-body vs Meta's GET/querystring shape, discovery, provider-error handling),
    service layer against a mocked adapter + the real DB (state verification incl. cross-user
    rejection, encryption round-trip, audit logging, ownership, and confirming `youtube` actually
    routes to the Google adapter), HTTP route wiring.
  - Verified live via `npm run dev` for both providers: auth-required 401s, empty account list,
    and the exact MISSING_CREDENTIALS message for each, all through the real running server.
  - **NOT live-verified against real Meta or Google apps.** All four provider env vars
    (`META_APP_ID`/`META_APP_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) are unset. Exact
    API versions/scopes are flagged in-code as needing a check against current docs (D-013, same
    honesty standard as modules/ai without a Claude key).
- **Testing:** 86 tests across 18 files, run 3x for determinism every time. `npm run build`
  succeeds; all 12 API routes register correctly.

## In Progress

(none — Instagram + Facebook + YouTube OAuth scaffolding fully done)

## Next

**Metrics ingestion** (roadmap's last Phase 2 item): the code that actually calls each connected
account's insights/analytics API (Instagram/Facebook Graph Insights, YouTube Analytics) and writes
`PlatformMetric` rows, plus a sync scheduler to run it periodically. This is real, substantial work
of its own — and, like the OAuth flows themselves, cannot be live-verified without at least one
real connected account, which needs real provider credentials first. **Deliberately not started
without checking in** — four large modules (auth, AI client, creator onboarding, OAuth scaffolding
for all 3 platforms) shipped in this session already; this is a natural point to let the user see
the whole picture and redirect if their priority has shifted (e.g. toward actually registering the
Meta/Google apps so something here can be proven end-to-end, or toward a first dashboard UI, since
nothing user-facing beyond the placeholder home page exists yet).

## Known Issues

None open. See `.ai/known-issues.md` for resolved history (BUG #001 git push access, BUG #002
Vitest env loading / test cross-contamination).

**Still true, not bugs — pending user action:**

- `ANTHROPIC_API_KEY` unset. modules/ai and modules/creator are fully mock-tested but have never
  made a real Claude call. The user said they'd add it — check `.env` at the start of any future
  session rather than assuming it's still missing.
- `META_APP_ID`/`META_APP_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unset. Needed to
  live-verify modules/integrations; requires the user to register apps with Meta and Google first
  (Part 67 — manual developer approval, cannot be done by the agent).
- No dashboard/UI beyond the Phase 0 placeholder home page. Everything built so far (auth, AI,
  onboarding, integrations) is API-only, verified via curl/tests, not a real user-facing screen.

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (86/86, run 3x for determinism),
`npm run build`, plus live `npm run dev` smoke tests of every auth and integrations route.

## Git

Branch: main
Last commit: `bf6e6f0` "feat: add Instagram + Facebook OAuth connection (Phase 2 scaffolding)"
(YouTube adapter is implemented and tested but NOT YET committed — see Next Recommended Action)
Last push: SUCCESS (as of `bf6e6f0`)
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Commit and push the YouTube adapter (`src/modules/integrations/google.ts` + `google.test.ts`,
   `service.ts`'s `getAdapter` wiring, `service.test.ts` addition).
2. Report the full Phase 2 OAuth scaffolding delivery to the user and let them redirect: metrics
   ingestion, real provider credentials, a dashboard UI, or something else — rather than silently
   starting another large unverifiable module.
