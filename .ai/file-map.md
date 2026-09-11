# FILE MAP

Inspect only the module you are working on.

## lib/ (shared infrastructure)

Purpose: env, db client, JSON API helpers, rate limiting, audit log.
Files: `env.ts`, `db.ts`, `api.ts` (parseJsonBody/apiErrorResponse), `rate-limit.ts` (in-memory,
single-process only), `audit.ts` (recordAuditLog/getClientIp) — all under `src/lib/`, each with a
`.test.ts`.
Status: DONE. Reused by modules/auth; expected to be reused by every future module.

## app/ (routes)

Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`
Status: shell only.

## modules/auth/

Purpose: signup, login, logout, session validation, password hashing.
Files: `src/modules/auth/{password,tokens,schemas,cookie,repository,errors,public-user,service,index}.ts`
Routes: `src/app/api/auth/{signup,login,logout,me}/route.ts`
Shared helpers used: `src/lib/{api,rate-limit,audit}.ts`
DB: users, sessions (models from prisma/schema.prisma, unchanged since Phase 0)
Status: DONE — 36 tests passing (unit + integration against real DB + HTTP route tests), verified
live via `npm run dev` (signup/me/logout/login/duplicate-signup all correct), audit log confirmed.

## modules/creator/

Purpose: onboarding interview, creator profile, goals.
DB: creator_profiles, goals
Status: PENDING (Phase 1)

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

Purpose: OAuth + ingestion per platform (instagram/, facebook/, youtube/).
DB: social_accounts, platform_metrics
Status: PENDING (Phase 2)

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
