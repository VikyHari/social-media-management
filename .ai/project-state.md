# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 2 done (OAuth for all 3 platforms, each correctly its own flow) + first UI (Phases 0-2).
User's stated priority: get real account connections working end to end BEFORE any AI work.

## Current Sprint

Just fixed two real problems surfaced this session (CI had been silently broken since Phase 0; the
Instagram OAuth architecture was built on stale assumptions) and wrote the actual account-setup
instructions the user asked for. See README "Connecting social accounts".

## Completed

- **CI fixed (BUG #003):** every GitHub Actions run had failed since the workflow was first added
  — `npm run typecheck` ran before anything generated Next.js's ambient route types. Fixed at the
  script level (`next typegen && tsc --noEmit`), not just in CI config. **Verified green** via the
  public GitHub Actions API, not assumed.
- **Instagram OAuth corrected (BUG #004, D-017):** the original implementation treated Instagram
  as sharing Facebook's OAuth flow — verified against live Meta docs that this is wrong. Instagram
  now has its own standalone adapter (`src/modules/integrations/instagram.ts`) on Instagram's own
  domain, with its own credential pair (`INSTAGRAM_APP_ID`/`SECRET`, distinct from
  `META_APP_ID`/`SECRET`). `meta.ts` is now Facebook-only.
- **Provider adapters now take injectable credentials (D-018)**, not just an injectable `fetch` —
  their tests no longer touch `process.env` at all, closing the exact risk class BUG #002 flagged.
- **README "Connecting social accounts"** — real, step-by-step setup instructions for Facebook,
  Instagram, and YouTube, including the exact redirect URIs the code expects and the
  Development/Testing-mode limitation (only accounts you add as testers can connect pre-review).
- 92 tests (up from 86 — 6 new for the Instagram split), run many times for determinism (see
  Known Issues — one inconclusive flake investigated at length, not fully resolved).
- Phase 0-2 work (foundation, auth, AI client, creator onboarding, OAuth scaffolding, first UI):
  all previously done — see git history / prior state if full detail is needed.

## In Progress

(none)

## Next

The user's priority is explicit: **account setup and linking, AI work last.** Everything needed on
the code side for that is now done and correct. What remains is entirely the user's own action:

1. **Follow README "Connecting social accounts"** to register the Meta app (Facebook + Instagram
   product) and the Google Cloud OAuth client, add the resulting credentials to `.env`.
2. Once any one credential pair is in `.env`, restart `npm run dev` and click that platform's
   Connect button on the dashboard — this is the first real end-to-end live test of
   modules/integrations, and I should walk through it live (Browser tool) once credentials exist,
   the same way the rest of the app was live-verified.
3. Only after account connection is proven working: circle back to `ANTHROPIC_API_KEY` /
   modules/ai / modules/creator live verification (explicitly deprioritized by the user).
4. Metrics ingestion (writing real `PlatformMetric` rows) is the logical following step once at
   least one account is genuinely connected — no point building it before there's real data to
   ingest from.

## Known Issues

See `.ai/known-issues.md`. One OPEN item: an intermittent test-suite flake (3 failing runs in a
row, then 30+ consecutive clean runs across many configurations) that could not be reproduced with
logging attached despite significant effort — investigated honestly, not swept under the rug, but
not resolved. A genuine safety fix (credential injection, D-018) was applied on its own merits
either way. Watch for recurrence; capture full output immediately if it happens again.

**Still true, not bugs — pending user action:**

- `META_APP_ID`/`META_APP_SECRET`/`INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`/`GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET` all unset. This is the user's current top priority — see README.
- `ANTHROPIC_API_KEY` unset — explicitly deprioritized by the user (do AI work last).

## Last Tested

2026-09-11 — format:check, lint, typecheck, `npm test` (92/92, run 30+ times across the flake
investigation), `npm run build`. CI confirmed green via the GitHub Actions API for the CI-fix
commit. No live OAuth test possible yet (no real credentials) — will be the first thing to verify
live once the user has added any one platform's credentials.

## Git

Branch: main
Last commit: `c1a35de` "fix: Instagram used the wrong OAuth flow; write real account-setup guide (BUG #004)"
Last push: SUCCESS — origin/main up to date with local main.
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Commit and push this session's fixes (CI fix already pushed; Instagram correction + credential
   injection + README setup guide still local).
2. Wait for the user to register the Meta app and/or Google Cloud OAuth client and add credentials
   to `.env` per the new README section — nothing further can be verified live until then.
3. Once any credentials land, live-walk the actual OAuth connection flow (Browser tool) the same
   way every other feature in this app has been verified, and report honestly what worked.
