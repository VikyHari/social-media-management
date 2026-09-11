# CURRENT TASK

## Task

Blocked on the user: they need to register a Meta app (Facebook + Instagram products) and/or a
Google Cloud OAuth client, then add the resulting credentials to `.env`. See README "Connecting
social accounts" for exact steps — this is a complete, accurate, step-by-step guide, not a stub.

## Type

Awaiting external action (credentials the agent cannot create — Part 67)

## What's done and correct, ready for real credentials

- `src/modules/integrations/{meta,instagram,google}.ts` — three independent, correctly-architected
  OAuth adapters (Facebook Login for Business, Instagram Business Login, Google OAuth), each
  verified against live provider documentation on 2026-09-11, not assumed from training knowledge.
- Encrypted token storage, CSRF-protected state, audit logging, disconnect — all working, tested.
- Dashboard UI shows real per-platform configured/connected state, no dead links.
- 92 tests passing; CI green (verified via the API, not assumed).

## What happens next (in order)

1. User follows README, gets credentials into `.env`.
2. First live OAuth test — walk the actual connect flow via the Browser tool once credentials
   exist for at least one platform. This is genuinely unverified until then; say so plainly if
   asked, don't imply it's been tested.
3. Metrics ingestion, once a real account is actually connected.
4. AI live verification (`ANTHROPIC_API_KEY`) — explicitly last, per the user's own priority.

## Constraints

Same pattern as everything before it: never claim something works without having verified it —
against a mocked test, a live browser walkthrough, or (for this specific area) live provider docs.
