# CURRENT TASK

## Task

YouTube OAuth (`src/modules/integrations/google.ts`), completing Phase 2's three-platform coverage.

## Type

New feature (extends an existing module)

## Target module

`src/modules/integrations`. New file `google.ts`; wire it into `service.ts`'s `getAdapter()`
(currently throws for `"youtube"`). No schema change needed — `SocialAccount`/`PlatformMetric`
already support any platform.

## Relevant files

- src/modules/integrations/types.ts (ProviderAdapter interface — implement this, don't redesign it)
- src/modules/integrations/meta.ts (structural template: injectable fetch, credential check,
  buildAuthorizationUrl/exchangeCode/discoverAccounts, honest "not live-verified" comment header)
- src/modules/integrations/service.ts (`getAdapter()` — add the youtube branch)
- src/lib/env.ts (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET already declared, currently blank)

## Constraints

- Google's OAuth 2.0 flow differs from Meta's in a real way worth getting right: Google returns an
  actual refresh_token (with `access_type=offline&prompt=consent`), unlike Meta's long-lived-token
  re-exchange approach — `ExchangedToken.refreshToken` exists in the type for exactly this.
- Scope needed: YouTube Data API read access (channel details + analytics-relevant scopes) —
  comment the exact scope strings as needing verification against Google's current OAuth scope
  reference, same honesty pattern as meta.ts's Graph API version comment.
- discoverAccounts should return the creator's own YouTube channel(s) via the Data API's
  `channels?mine=true` equivalent.
- Same testing approach as meta.ts: injectable fetch, mocked in unit tests, no real network call.
- Not live-verifiable without GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (unset) — build and mock-test
  regardless, state plainly in `.ai/` that it's unverified.

## Expected result

`getAdapter("youtube")` returns a working adapter; `initiateConnection`/`completeConnection` work
identically for YouTube as they already do for Instagram/Facebook (same service.ts code path, zero
platform-specific branching there). Lint/typecheck/tests/build pass.

## Validation

`npm run lint && npm run typecheck && npm test && npm run build`, plus new unit tests
(mocked-fetch, mirroring meta.test.ts) and updated service-layer coverage for the youtube case.
