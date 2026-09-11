# ARCHITECTURE

## Stack (decided — do not re-ask)

| Layer           | Choice                                                |
| --------------- | ----------------------------------------------------- |
| App framework   | Next.js 16 (App Router, React 19, TypeScript, strict) |
| Styling         | Tailwind CSS v4                                       |
| Database        | PostgreSQL 16 (Docker locally)                        |
| ORM             | Prisma 7                                              |
| Validation      | Zod 4                                                 |
| AI              | Claude API via `@anthropic-ai/sdk`                    |
| Tests           | Vitest (unit/integration); Playwright for e2e later   |
| Lint/format     | ESLint 9 (eslint-config-next) + Prettier              |
| CI              | GitHub Actions (`.github/workflows/ci.yml`)           |
| Package manager | npm                                                   |

## Shape

Modular monolith. One deployable Next.js app. Business logic lives in `src/modules/<module>/`,
routes in `src/app/`, shared infrastructure in `src/lib/`. No microservices, queues or event buses
until a real need appears.

```
src/
  app/                # Next.js routes, layouts, route handlers (thin)
    api/              # HTTP endpoints (health, oauth callbacks, webhooks)
  modules/            # Domain modules (service + repository + types + tests)
    auth/
    creator/          # onboarding interview, creator profile
    integrations/     # instagram/, facebook/, youtube/ (OAuth + ingestion)
    analytics/        # deterministic metrics, aggregation, trends
    content/          # ideas, scripts, calendar, workflow states
    ai/               # Claude client, prompts, structured outputs, memory
    recommendations/  # priorities, suggestions, experiments
    notifications/
  components/         # shared UI
  lib/                # env, db, crypto, http helpers
prisma/               # schema.prisma + migrations/
.ai/                  # project memory (read first)
docs/                 # human docs
```

## Module rules

- A module exposes a small public surface (`index.ts`); routes call services, never Prisma directly.
- Deterministic math (growth rates, averages, trends) lives in `analytics/` — never delegated to the LLM.
- LLM output that feeds the app must be schema-validated (Zod) before use.
- Every metric shown to the creator is tagged OBSERVED / CALCULATED / INFERRED / PREDICTED.

## Security baseline

- Env validated at startup (`src/lib/env.ts`); secrets only in `.env` (ignored).
- Social OAuth tokens encrypted at rest (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`).
- DB-backed sessions in httpOnly, SameSite=Lax, Secure cookies.
- Server Actions get Next.js origin/CSRF protection; route handlers validate input with Zod.
- Audit log table for sensitive actions (connect/disconnect account, publish, approve).

## Conventions

- Files: kebab-case. Types/components: PascalCase. Prisma models: PascalCase, tables snake_case via `@@map`.
- Tests colocated as `*.test.ts` next to the code they test.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).
