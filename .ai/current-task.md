# CURRENT TASK

## Task

Transition point: Phase 1 core (auth, AI client, onboarding interview + profile) is done.
Phase 2 (social OAuth) is next per the roadmap, but needs real Meta/Google app credentials the
user hasn't provided yet — asking before guessing at OAuth specifics that would likely need
rework. See `.ai/project-state.md` "Next".

## Type

Checkpoint / awaiting user input (credentials)

## Target module

None in progress. Next real target once unblocked: `src/modules/integrations` (new) +
`prisma/schema.prisma` (SocialAccount, PlatformMetric models).

## What can proceed without credentials (safe to start any time)

- `prisma/schema.prisma`: `SocialAccount` (platform, external account id, encrypted tokens, scopes,
  status, timestamps), `PlatformMetric` (platform, metric type, value, observed date — see
  architecture.md's OBSERVED/CALCULATED/INFERRED/PREDICTED tagging).
- `src/lib/crypto.ts`: AES-256-GCM encrypt/decrypt helpers using the already-provisioned
  `TOKEN_ENCRYPTION_KEY` (D-0xx to record once written), with tests.
- OAuth state-token generation/verification (CSRF protection for the callback), unit-testable
  without a real provider.

## What needs the user first

- A Meta app (covers both Instagram and Facebook — Part 25) with `META_APP_ID`/`META_APP_SECRET`,
  and the exact redirect URI it's configured with.
- A Google Cloud OAuth client (YouTube Data API) with `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
  and its redirect URI.
- Until these exist, authorization-URL construction and token exchange can be written against the
  documented API shapes but cannot be live-verified — same honesty standard as modules/ai without
  a Claude key: build it, test it against mocks, say plainly that it's unverified.

## Also pending (not blocking, cheap): `ANTHROPIC_API_KEY`

`modules/ai` and `modules/creator` are fully built and tested against a mocked Claude client but
have never made a real API call. Add the key to `.env` (never commit it) whenever convenient, then
a manual `npm run dev` + real onboarding run would be the first live verification.
