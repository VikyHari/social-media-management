# FILE MAP

Inspect only the module you are working on.

## lib/ (shared infrastructure)

Purpose: env, db client, JSON API helpers, rate limiting, audit log, encryption, signed tokens.
Files: `env.ts`, `db.ts`, `api.ts` (parseJsonBody/apiErrorResponse), `rate-limit.ts` (in-memory,
single-process only), `audit.ts` (recordAuditLog/getClientIp), `crypto.ts` (AES-256-GCM
encryptSecret/decryptSecret via TOKEN_ENCRYPTION_KEY), `signed-token.ts` (generic signed
short-lived opaque tokens, HMAC via SESSION_SECRET) — all under `src/lib/`, each with a `.test.ts`.
Status: DONE. Reused across modules/auth, modules/integrations; expected to be reused further.

## app/ (routes + first UI)

API routes: see each module's section above (auth, creator, integrations) + `api/health`.
Pages (all Server Component wrappers + a Client Component for the interactive part, matching
Next.js App Router convention):

- `src/app/page.tsx` — `/`, just redirects to `/dashboard` or `/login` by auth state.
- `src/app/login/{page,login-form}.tsx` — combined signup/login form.
- `src/app/dashboard/{page,sign-out-button,platform-section}.tsx` — the hub: greeting, profile
  summary or onboarding CTA, goals, connect/disconnect per platform (honestly shows "not
  configured yet" when a provider's env vars are unset, not a broken link).
- `src/app/onboarding/{page,onboarding-chat}.tsx` — the interview chat UI.
  Auth plumbing: `src/lib/auth-guard.ts` (`requireUser()`/`getOptionalUser()` — Server Component
  page guards) + `src/modules/auth/cookie.ts`'s `getSessionTokenFromCookieStore()` (the
  `next/headers` counterpart to route handlers' `getSessionToken(request)`).
  Status: DONE — the first real, navigable UI. No component-test framework exists yet (Vitest here
  is `environment: "node"`, no jsdom/RTL); verified instead via a live walkthrough through the actual
  running app using the Browser tool (see decisions.md) — full signup → dashboard → onboarding →
  sign-out → re-login flow confirmed, including the honest "not configured yet" / graceful-error
  states where real credentials are missing.

## modules/auth/

Purpose: signup, login, logout, session validation, password hashing.
Files: `src/modules/auth/{password,tokens,schemas,cookie,repository,errors,public-user,service,index}.ts`
Routes: `src/app/api/auth/{signup,login,logout,me}/route.ts`
Shared helpers used: `src/lib/{api,rate-limit,audit}.ts`
DB: users, sessions (models from prisma/schema.prisma, unchanged since Phase 0)
Status: DONE — 36 tests passing (unit + integration against real DB + HTTP route tests), verified
live via `npm run dev` (signup/me/logout/login/duplicate-signup all correct), audit log confirmed.

## modules/creator/

Purpose: adaptive onboarding interview + the structured creator profile and goals it produces.
Files: `prompts.ts` (interview + extraction system prompts), `schemas.ts` (Zod:
`creatorProfileExtractionSchema` incl. nested `goals`, `interviewTurnSchema`), `interview.ts`
(`startInterview`/`continueInterview` — orchestrates modules/ai; the interview loop forces
`interviewTurnSchema` each turn, and once the model sets `readyToExtractProfile`, immediately
runs a second forced-tool call against the full transcript to extract the profile), `repository.ts`
(`upsertProfile` — re-running onboarding updates the same row, doesn't duplicate), `profile.ts`
(read-only getProfile/getGoals), `errors.ts` (CONVERSATION_NOT_FOUND/FORBIDDEN — ownership checked
on every continue call), `index.ts`.
Routes: `POST /api/creator/onboarding` (start), `PATCH /api/creator/onboarding` (continue, body:
`{conversationId, message}`), `GET /api/creator/profile`. All require an authenticated session
(reuses `modules/auth`'s `getCurrentUser`/`getSessionToken`).
DB: creator_profiles, goals (migration `20260911075752_creator_intelligence`). The raw interview
transcript itself lives in `modules/ai`'s `ai_conversations`/`ai_messages` (purpose: "onboarding"),
linked back via `creator_profiles.source_conversation_id` — no separate transcript storage built.
Status: DONE — 8 new tests (interview logic with a mocked AI client + real DB: happy path,
extraction + upsert-on-rerun, ownership rejection, missing-conversation rejection; plus an HTTP
route test wiring auth + creator together). 53 tests total in the project, run 3x for determinism.
Build succeeds. **Not live-tested against the real Claude API** — same `ANTHROPIC_API_KEY` gap as
modules/ai; see .ai/project-state.md.
Deliberately not built yet: "Niche analysis" / "Audience analysis" as dedicated features (roadmap) —
the interview only lightly challenges scattered/unrealistic niches inline (Part 41); a real
analysis pass wants either platform data (Phase 2/3) or its own task.

## modules/ai/

Purpose: the ONLY module allowed to call the Anthropic SDK directly (decisions.md D-005). Every
other module gets structured, Zod-validated data out of Claude through this one.
Files: `models.ts` (exact model IDs — D-005), `client.ts` (lazy singleton, throws AiError if
ANTHROPIC_API_KEY unset), `structured.ts` (`generateStructured<T>()`: forces a tool call shaped by
a Zod schema, validates, retries once with a corrective tool_result on failure), `pricing.ts`
(cost estimate — table is deliberately empty/unverified, returns null until real Anthropic
pricing is filled in; token counts are always accurate), `conversation.ts` + `repository.ts`
(AiConversation/AiMessage — generic multi-turn history, tagged by `purpose`), `usage.ts`
(AiUsageLog, never throws), `errors.ts`, `index.ts`.
DB: ai_conversations, ai_messages, ai_usage_logs (added in migration `20260911065727_ai_engine`).
`ai_memory` (long-term creator understanding, Part 62) intentionally NOT built yet — it belongs
with modules/creator, which has something to write into it.
Status: DONE — 45 tests total in the project (module's own: unit tests for pricing + structured
mocked-client retry/error paths, integration tests for conversation/usage against the real DB).
NOT live-tested against the real Claude API — ANTHROPIC_API_KEY is unset in this environment (see
.ai/project-state.md). `npm run build` confirms the module needs no key at build time (lazy client).

## modules/integrations/

Purpose: connect Instagram/Facebook/YouTube via official OAuth only (Part 25/45 — no scraping, no
password capture). Metrics _ingestion_ (writing PlatformMetric rows from the connected accounts)
is a separate, later task — this module only gets an account connected and stores its token.
Files: `types.ts` (`Platform`, `ProviderAdapter` — the seam `service.ts` orchestrates against so
it never needs to know which provider it's talking to), `errors.ts`, `repository.ts`
(`upsertAccount`/`listAccounts` — list SELECTs never include the encrypted token columns),
`meta.ts` (Instagram + Facebook share ONE Meta app/OAuth flow — Instagram has no separate OAuth of
its own; accounts are discovered via linked Facebook Pages), `google.ts` (YouTube — Google OAuth
2.0, returns a real `refresh_token` unlike Meta's long-lived-token re-exchange; discovers the
creator's own channel via the YouTube Data API), `service.ts` (`initiateConnection`/
`completeConnection`/`disconnectAccount` — signs/verifies OAuth CSRF state, encrypts tokens before
they ever reach the DB, audit-logs connect/disconnect), `index.ts`.
Shared infra this leans on (`src/lib/`): `crypto.ts` (AES-256-GCM via `TOKEN_ENCRYPTION_KEY`),
`signed-token.ts` (generic signed short-lived tokens — OAuth state today, reusable for e.g. email
verification later).
Routes: `GET /api/integrations` (list, never returns tokens), `GET /api/integrations/[platform]/start`
(redirects to the provider's consent screen), `GET /api/integrations/[platform]/callback`
(exchanges the code, redirects home with a status query param — no dedicated integrations page
exists yet), `DELETE /api/integrations/accounts/[accountId]` (disconnect, Part 52). Note the
`accounts/[accountId]` nesting: Next.js forbids two different dynamic segment _names_
(`[platform]` vs `[accountId]`) as siblings at the same path depth.
DB: social_accounts, platform_metrics (migration `20260911081710_social_connections`).
Status: DONE for all three platforms (Instagram + Facebook via one Meta app, YouTube via Google).
30 tests: Meta adapter + Google adapter (each against a mocked `fetch`), service layer (mocked
adapter + the real DB, incl. confirming `youtube` routes to the Google adapter not Meta's), HTTP
route wiring. Verified live via `npm run dev`: auth-required checks, empty list, and the
MISSING_CREDENTIALS error path for both Meta and Google, all confirmed through the real server.
**Not live-verified against real Meta or Google apps** — `META_APP_ID`/`META_APP_SECRET`/
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are all unset. Exact Graph/YouTube API versions and
scopes (top comments in `meta.ts`/`google.ts`) should be checked against current docs before this
ever runs for real. Same honesty standard as modules/ai without a Claude key.
Next real work here: metrics ingestion (writing `PlatformMetric` rows from each platform's
insights/analytics API) + a sync scheduler — deliberately not part of the OAuth scaffolding.

## modules/analytics/

Purpose: deterministic metrics, growth, content performance.
DB: platform_metrics, content_performance
Status: PENDING (Phase 3)

## modules/content/

Purpose: ideas, scripts, calendar, workflow.
DB: content_items, content_versions, ideas, scripts, content_calendar, content_pillars
Status: PENDING (Phase 4)

## modules/recommendations/, modules/notifications/

Status: PENDING (Phase 5+)

## prisma/

`schema.prisma`, `migrations/`, `prisma.config.ts` (root)
Status: in progress.

## Tooling

`docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`, `vitest.config.ts`,
`.prettierrc`, `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`
