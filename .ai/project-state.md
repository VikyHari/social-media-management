# PROJECT STATE — AI Creator Growth Manager

> READ THIS FIRST. It is the authoritative development state. Update after every meaningful change.

## Phase

PHASE 2 done (OAuth scaffolding, all 3 platforms) + a first real UI now exists across Phases 1-2.

## Current Sprint

Just shipped: login/signup, a dashboard hub, and the onboarding chat — the app's first real,
navigable UI, tying together auth + AI + creator onboarding + social connection.

## Completed

- **Phase 0 (foundation) + Phase 1 (auth, AI client, onboarding interview + creator profile) +
  Phase 2 (Instagram/Facebook/YouTube OAuth scaffolding):** all done, tested, pushed. See git
  history for full detail if needed.
- **First UI** (`src/app/{page,login,dashboard,onboarding}`), on top of `src/lib/auth-guard.ts`
  (`requireUser()`/`getOptionalUser()` Server Component guards) and a new
  `getSessionTokenFromCookieStore()` in `src/modules/auth/cookie.ts` (the `next/headers`
  counterpart to route handlers' request-based cookie reading, D-016).
  - `/` — redirects to `/dashboard` or `/login` by auth state.
  - `/login` — combined signup/login form (Client Component), redirects to `/dashboard` on success.
  - `/dashboard` — the hub: greeting, profile summary or an onboarding CTA if none exists yet,
    goals list, and a connect/disconnect row per platform that honestly shows "Not configured yet"
    (grayed out, no dead link) when a provider's env vars are unset rather than offering a button
    that would just error. Handles the OAuth callback's `?connected=`/`?integration_error=` banner.
  - `/onboarding` — the interview chat UI: starts a conversation on load, sends each answer via
    `PATCH`, shows the profile-ready state and a link back on completion. Degrades gracefully (a
    clear error message, no crash) when `ANTHROPIC_API_KEY` is missing — verified this is actually
    what happens, not assumed.
  - **No component-test framework was added** (D-015) — verified instead via a full live
    walkthrough through the real running app using the Browser tool: signup → dashboard (correct
    greeting, correct empty states) → onboarding (graceful failure, confirmed via server logs to
    be the missing API key, not a bug) → back to dashboard (session persisted) → sign out →
    `/dashboard` correctly redirects to `/login` while signed out → log back in → both the success
    and error callback banners render correctly. Every step confirmed against the actual app, not
    assumed from reading the code.
  - `npm run build` succeeds; `/`, `/login`, `/dashboard`, `/onboarding` all register correctly.
- **Testing:** 86 automated tests (unchanged by this UI work — it's a presentation layer over
  already-tested APIs/services), run 3x for determinism. Full suite + build green throughout.

## In Progress

(none — first UI fully done and live-verified)

## Next

Same open decision as before this UI pass — nothing has resolved it, just made the app usable
enough that the choice matters more now:

1. **Metrics ingestion** (last Phase 2 item) — needs a real connected account to verify against.
2. **Real provider credentials** (Meta app, Google Cloud OAuth client, or both) — would let both
   modules/integrations AND the dashboard's connect buttons finally prove themselves end to end.
3. **Live-verify modules/ai + modules/creator** — check `.env` for `ANTHROPIC_API_KEY` (the user
   said they'd add it); if present, the onboarding chat UI just built is the natural way to
   verify it for real, no extra work needed.
4. **More UI**: only the happy paths got a screen. No password-reset flow, no way to edit the
   profile outside redoing the whole interview, no settings page, no content/analytics screens
   (nothing to show yet — Phase 3/4 don't exist).

## Known Issues

None open. See `.ai/known-issues.md` for resolved history (BUG #001 git push access, BUG #002
Vitest env loading / test cross-contamination).

**Still true, not bugs — pending user action:**

- `ANTHROPIC_API_KEY` unset. Check `.env` at the start of any future session before assuming.
- `META_APP_ID`/`META_APP_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unset — needs the user
  to register apps with Meta and Google (Part 67, cannot be done by the agent).
- A stray `npm run dev` from earlier in this session was left listening on port 3000 and had to be
  stopped before the final live UI walkthrough. If a future session hits "port already in use",
  check `Get-NetTCPConnection -LocalPort 3000` (PowerShell) before assuming something is wrong.

## Last Tested

2026-09-11 — full suite: format:check, lint, typecheck, `npm test` (86/86), `npm run build`, plus
a complete live browser walkthrough of the new UI (see "Completed" above for the exact steps).

## Git

Branch: main
Last commit: `e2cda4f` "feat: add first UI - login, dashboard, onboarding chat"
Last push: SUCCESS — origin/main up to date with local main.
Remote: https://github.com/VikyHari/social-media-management.git

## Next Recommended Action

1. Commit and push the UI (`src/app/{page.tsx,login/**,dashboard/**,onboarding/**}`,
   `src/lib/auth-guard.ts`, the `src/modules/auth/cookie.ts` + `index.ts` addition, the
   `src/modules/integrations/types.ts`/`index.ts` `PLATFORMS` export).
2. Report the delivery and ask the user to pick from "Next" above — every remaining direction
   depends on either credentials only they can provide, or a scope decision.
