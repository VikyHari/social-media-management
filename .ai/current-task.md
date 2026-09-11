# CURRENT TASK

## Task

Finish PHASE 0 foundation.

## Type

Configuration / Architecture

## Target module

lib/, prisma/, app/api/health

## Relevant files

- prisma/schema.prisma, prisma.config.ts
- src/lib/db.ts
- src/app/api/health/route.ts
- package.json (scripts)
- CLAUDE.md, README.md

## Constraints

- Smallest correct change; no features before the foundation runs.
- No secrets in tracked files.

## Expected result

`npm run dev` serves `/` and `/api/health` reports `{ status: "ok", db: "ok" }`.
Lint, typecheck, tests, build pass. First commit pushed to origin/main.

## Validation

`npm run lint && npm run typecheck && npm test && npm run build`, then hit `/api/health`.
