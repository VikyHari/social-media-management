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
- **D-011 · 2026-09-11 · SUPERSEDED BY D-017.** Originally: "Instagram and Facebook are one Meta
  OAuth flow." This was wrong — see BUG #004 and D-017. Kept for history; do not implement against
  this entry.
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
- **D-015 · 2026-09-11 · First UI verified live, not via component tests.** No jsdom/React
  Testing Library setup exists (Vitest here runs `environment: "node"` for the API/service layer).
  Rather than adding a whole second test runtime for one page's worth of UI, the login → dashboard
  → onboarding → sign-out flow was verified by actually driving the running dev server (Claude's
  Browser tool): real signup, real session cookie, real redirects, real graceful-degradation
  states. Revisit (add jsdom + RTL) once UI complexity grows enough that live walkthroughs stop
  being a proportionate check — don't add the infrastructure pre-emptively (Part 22).
- **D-016 · 2026-09-11 · Server Components call service functions directly, not their own API
  routes.** `/dashboard` calls `getProfile`/`getGoals`/`listAccounts` in-process rather than
  `fetch`-ing `/api/creator/profile`/`/api/integrations` over HTTP. Client Components (forms,
  connect/disconnect buttons) do use `fetch` against the API routes, since they run in the browser
  and have no other way in. Standard Next.js App Router split — server-side data reads skip the
  network hop; client-side mutations go through the same routes the tests already cover.
- **D-017 · 2026-09-11 · Instagram uses its own standalone "Instagram Business Login" OAuth flow,
  not Facebook's (supersedes D-011, see BUG #004).** Verified against live Meta developer docs:
  Instagram's own domain (`instagram.com`/`api.instagram.com`/`graph.instagram.com`), its own
  credential pair (`INSTAGRAM_APP_ID`/`SECRET`, distinct from `META_APP_ID`/`SECRET`), no Facebook
  Page required. `src/modules/integrations/instagram.ts` implements it; `meta.ts` is now
  Facebook-only. Lesson generalized in BUG #004: verify third-party API integrations against live
  docs before writing setup instructions a real user follows, not just before writing code that
  only ever talks to mocks in tests.
- **D-018 · 2026-09-11 · OAuth provider adapters accept injectable credentials, not just an
  injectable `fetch`.** `createMetaAdapter`/`createInstagramAdapter`/`createGoogleAdapter` all take
  an optional credentials override now, so their tests never mutate `process.env` (the exact
  pattern BUG #002 warned would recur — see the open FLAKE entry in known-issues.md). Same
  dependency-injection shape as `structured.ts`'s injectable AI client (D-009 era).
