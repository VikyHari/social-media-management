# CURRENT TASK

## Task

Checkpoint after shipping Phase 2's full OAuth scaffolding (Instagram + Facebook + YouTube). No
task in progress — awaiting user direction. See `.ai/project-state.md` "Next".

## Type

Checkpoint

## Candidate next tasks (not started, pick one or redirect)

1. **Metrics ingestion + sync scheduler** (last Phase 2 roadmap item): call each connected
   account's insights/analytics API, write `PlatformMetric` rows. Needs at least one real
   connected account to verify against — which needs real provider credentials first.
2. **A first dashboard UI**: nothing user-facing exists beyond the Phase 0 placeholder home page.
   Everything built (auth, AI, onboarding, integrations) is API-only. A login/signup screen +
   onboarding chat UI + "connect your accounts" screen would make the product actually usable by a
   human, not just by tests and curl.
3. **Real provider credentials**: register a Meta app and a Google Cloud OAuth client so
   modules/integrations can finally be live-verified end to end (currently 100% mock-tested).
4. **Live-verify modules/ai + modules/creator**: if `ANTHROPIC_API_KEY` has been added to `.env`,
   run a real onboarding interview via `npm run dev` for the first time.

## Constraints

Whatever comes next, keep following the established pattern: build what doesn't need external
credentials, test it thoroughly (real DB where relevant, mocked external calls), state plainly in
`.ai/` what has and hasn't been verified against a real API — never claim untested code works.
