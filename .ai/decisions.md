# DECISIONS (ADR-lite)

Format: `D-### · date · decision · why · consequences`

- **D-001 · 2026-09-11 · Next.js 16 modular monolith.** One deployable covers UI, API routes and
  server actions; simplest thing that can grow. No microservices until needed.
- **D-002 · 2026-09-11 · PostgreSQL + Prisma 7.** Relational data (creators, accounts, metrics,
  content). Docker Compose locally; CI uses a Postgres service container.
- **D-003 · 2026-09-11 · npm as package manager.** Only one installed; avoids extra tooling.
- **D-004 · 2026-09-11 · Custom DB-backed session auth (not Auth.js).** Auth.js v5 is still beta
  and its Credentials provider does not support DB sessions cleanly. Users/sessions tables,
  `bcryptjs` hashing, httpOnly cookie. Small, fully controlled, upgradeable later. Social platforms
  are _connected_ via their own OAuth flows (not used for app login).
- **D-005 · 2026-09-11 · Claude API for all LLM work.** Official `@anthropic-ai/sdk`. Model choice
  per task (cheaper model for classification/summaries, strongest for strategy). Exact IDs are set
  in `src/modules/ai` when implemented; never hardcode models outside that module.
- **D-006 · 2026-09-11 · Deterministic analytics stay out of the LLM.** All math in
  `src/modules/analytics`; the LLM only interprets and recommends.
- **D-007 · 2026-09-11 · Env validated lazily with Zod.** `getEnv()` caches; `next build` does
  not require secrets; CI supplies dummy values.
- **D-008 · 2026-09-11 · Project memory in `.ai/`.** `project-state.md` is the source of truth
  read before any task; targeted file inspection instead of repo-wide reads.
