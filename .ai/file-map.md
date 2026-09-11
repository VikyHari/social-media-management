# FILE MAP

Inspect only the module you are working on.

## lib/ (shared infrastructure)

Purpose: env, db client, crypto, helpers.
Files: `src/lib/env.ts` (+test), `src/lib/db.ts`
Status: env done; db in progress.

## app/ (routes)

Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`
Status: shell only.

## modules/auth/

Purpose: users, sessions, login/logout, password hashing.
DB: users, sessions (models exist in prisma/schema.prisma since Phase 0)
Status: IN PROGRESS (Phase 1) — see .ai/current-task.md

## modules/creator/

Purpose: onboarding interview, creator profile, goals.
DB: creator_profiles, goals
Status: PENDING (Phase 1)

## modules/ai/

Purpose: Claude client, prompt templates, structured outputs, usage logging, ai_memory.
DB: ai_conversations, ai_memory
Status: PENDING (Phase 1)

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
