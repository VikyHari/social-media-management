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
- **D-009 · 2026-09-11 · Structured LLM output via forced tool-use, not free-text JSON parsing.**
  `src/modules/ai/structured.ts` builds a `Tool.input_schema` from the caller's Zod schema
  (`z.toJSONSchema`), forces that tool with `tool_choice`, and validates the result — one
  corrective retry via a `tool_result` block if validation fails, then throws. Reinforces D-006:
  nothing downstream ever trusts unvalidated model output.
- **D-010 · 2026-09-11 · AI cost estimates are never fabricated.** `src/modules/ai/pricing.ts`
  ships with an empty pricing table and returns `null` until real per-model USD rates are filled
  in from Anthropic's pricing page. Token counts (`AiUsageLog.inputTokens`/`outputTokens`) are
  always the real, observed numbers from the API response and are the source of truth until then.
- **D-011 · 2026-09-11 · Instagram and Facebook are one provider (Meta), not two.** The Instagram
  Graph API has no OAuth of its own — access comes through Facebook Login against a single Meta
  app, and IG Business accounts are discovered via the Facebook Page they're linked to.
  `src/modules/integrations/meta.ts` implements both `platform`s off one OAuth mechanism.
- **D-012 · 2026-09-11 · Provider-agnostic orchestration via a `ProviderAdapter` interface.**
  `src/modules/integrations/service.ts` never imports a provider SDK directly; it calls
  `buildAuthorizationUrl`/`exchangeCode`/`discoverAccounts` on whichever adapter `getAdapter()`
  returns. Adding YouTube means writing `google.ts` against the same interface, not touching
  `service.ts`.
- **D-013 · 2026-09-11 · Build unverifiable integrations honestly, the same way as modules/ai.**
  OAuth code against Meta/Google is written and unit-tested (mocked `fetch`/mocked adapter) without
  real app credentials, exactly like `generateStructured` was built without a real Claude key
  (D-005 era). `.ai/` records plainly what has and hasn't been exercised against the real API.
- **D-014 · 2026-09-11 · Google returns a real refresh_token; Meta doesn't.** `google.ts` requests
  `access_type=offline&prompt=consent` and stores the returned `refresh_token` (encrypted, same as
  the access token). Meta instead exchanges a short-lived token for a ~60-day long-lived one
  (D-011) — there's no refresh token in that flow. `ExchangedToken.refreshToken` stays optional to
  fit both shapes without provider-specific branching in `service.ts`.
