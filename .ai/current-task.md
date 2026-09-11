# CURRENT TASK

## Task

Checkpoint after shipping the first UI (login, dashboard, onboarding chat). No task in progress —
awaiting user direction. See `.ai/project-state.md` "Next" for the full candidate list.

## Type

Checkpoint

## Candidate next tasks (not started, pick one or redirect)

1. **Metrics ingestion + sync scheduler**: needs a real connected account to verify against.
2. **Real provider credentials**: Meta app and/or Google Cloud OAuth client — unlocks live
   verification of modules/integrations AND the dashboard's connect buttons.
3. **Live-verify modules/ai + modules/creator**: check `.env` for `ANTHROPIC_API_KEY` first — the
   user said they'd add it. If present, just use the onboarding chat UI already built.
4. **More UI**: password reset, editing the profile without redoing the whole interview, a
   settings page. Nothing for Phase 3/4 (analytics, content) since those phases don't exist yet.

## Constraints

Same pattern as everything before it: build what doesn't need external credentials, test it
thoroughly, state plainly in `.ai/` what has and hasn't been verified against a real API or a real
browser — never claim untested code or UI works.
