# KNOWN ISSUES / BUG LOG

Format:

```
BUG #NNN · <date>
Problem:    ...
Module:     ...
Root cause: ...
Fix:        ...
Files:      ...
Test:       ...
Status:     OPEN | RESOLVED | WONTFIX
Recurrence: LOW | MEDIUM | HIGH — why
```

## Open

```
FLAKE (not a confirmed bug) · 2026-09-11
Problem:    npm test failed intermittently in one cluster of runs (3, 2, then 4 of 6 failures in
            three consecutive batches), with different tests failing each time and no error
            output ever successfully captured (every attempt to reproduce with full logging, or
            to catch it via a stop-on-failure loop, came back clean — 30 consecutive clean runs
            across parallel, serial (--no-file-parallelism) and mixed batches after that cluster).
Module:     Test tooling — cause not isolated to a specific module.
Root cause: UNKNOWN. Investigated and ruled out: (1) process.env mutation across integration
            adapter test files (meta/instagram/google .test.ts) — removed entirely in favor of
            injected credentials (a genuine improvement either way, matching the BUG #002 lesson),
            but the flake persisted in the batch immediately after that change, then vanished for
            30 straight runs — so it wasn't (solely) the cause. (2) Vitest file-parallelism itself
            — serial runs were clean, but so were most parallel runs, so this isn't confirmed
            either. Suspected but unconfirmed: transient system/Docker resource contention from a
            burst of unrelated heavy activity (browser automation, many web fetches, a killed
            process) immediately preceding the failing cluster, on this Windows/Docker Desktop
            host — coincides with the timing better than any code-level theory tested so far.
Fix:        None applied specifically for this — the credential-injection change (see D-017-adjacent
            commit) was made on its own merits, not because it was proven to fix this.
Files:      N/A — no root cause confirmed, so no targeted fix.
Test:       Could not reproduce with logging attached. If this recurs: capture full `npm test`
            output (not just the summary line) immediately, and check Docker/system resource
            state (`docker stats`, Task Manager) at the moment of failure before anything else
            changes.
Status:     OPEN — logged rather than silently dropped, honestly unresolved. Downgrade to WONTFIX
            if it does not recur across a few more normal sessions; escalate if it does.
Recurrence: UNKNOWN.
```

## Resolved

```
BUG #004 · 2026-09-11
Problem:    modules/integrations/meta.ts treated Instagram as reachable through the same Facebook
            Login OAuth dialog/token exchange as Facebook Pages (D-011), discovering the linked
            Instagram Business account via a Page's instagram_business_account field. This would
            have failed for real users: the scopes it requested (instagram_basic,
            instagram_manage_insights) were deprecated by Meta on January 27, 2025.
Module:     modules/integrations (meta.ts, service.ts, src/lib/env.ts).
Root cause: D-011 was based on how Instagram Graph API access worked historically, not verified
            against Meta's current documentation before being implemented. Meta has since
            introduced "Instagram Business Login" — a standalone OAuth flow on Instagram's own
            domain (instagram.com / api.instagram.com / graph.instagram.com), using its OWN
            credential pair (Instagram App ID/Secret, distinct from the app's main Meta App
            ID/Secret) and requiring no Facebook Page at all. Caught by verifying against live
            Meta developer docs (WebSearch + WebFetch) before writing user-facing setup
            instructions, not by any test — nothing in the test suite could have caught an
            architecture built against stale knowledge, since the mocked tests only verify
            internal consistency, not that the mocked shape matches reality.
Fix:        Split Instagram into its own adapter, src/modules/integrations/instagram.ts,
            implementing the standalone flow (D-017). meta.ts is now Facebook-only. Added
            INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET to env.ts, .env.example, .env — separate from
            META_APP_ID/META_APP_SECRET. Updated service.ts's getAdapter() and the dashboard's
            per-platform "configured" check accordingly.
Files:      src/modules/integrations/{meta,instagram,service}.ts, src/lib/env.ts, .env.example,
            .env, src/app/dashboard/page.tsx, + new/updated tests for all three.
Test:       New instagram.test.ts (7 tests) mirrors meta.test.ts's rigor: URL construction on the
            instagram.com domain, the two-hop token exchange's distinct POST-then-GET shape and
            data[0]-wrapped response, discovery via graph.instagram.com. 92 tests total.
Status:     RESOLVED — 2026-09-11. Still NOT live-verified against a real Instagram Business Login
            app (no INSTAGRAM_APP_ID configured) — same honesty standard as everything else in
            this module; see project-state.md.
Recurrence: MEDIUM for any third-party API integration built from training knowledge rather than
            verified live docs — platform OAuth flows change. Lesson: verify against live docs
            before writing setup instructions a real user will follow, not just before writing
            code that only talks to itself in tests.
```

```
BUG #003 · 2026-09-11
Problem:    Every GitHub Actions CI run had failed since the workflow was first added — every
            single push this whole session (12 consecutive runs) — with
            "src/app/layout.tsx#L9: Cannot find name 'LayoutProps'." This was invisible locally:
            `npm run typecheck` passed every time it was run in this session.
Module:     Tooling — package.json's typecheck script, .github/workflows/ci.yml.
Root cause: `LayoutProps<"/">` is an ambient global type Next.js generates into `.next/types/`
            (and `next-env.d.ts`) on `next dev`/`next build`/`next typegen` — it does not exist on
            a fresh checkout until one of those has run once. CI runs `npm run typecheck`
            (`tsc --noEmit`) before any build/dev step, so on every fresh CI checkout that type
            was genuinely missing. Locally it always looked fine because `.next/` had already been
            populated by the many `npm run dev`/`npm run build` calls made earlier in the same
            working directory — a stale-cache blind spot that never affects a truly clean checkout,
            which is exactly what CI always is. Never caught because `gh` CLI isn't installed and
            GitHub Actions status was never checked this session — confirmed via the public
            GitHub Actions REST API (unauthenticated, this repo is public) that all 12 runs going
            back to the very first commit that included the workflow had failed the same way.
Fix:        `package.json`'s `typecheck` script now runs `next typegen && tsc --noEmit` instead of
            bare `tsc --noEmit` — `next typegen` is a lightweight Next.js 16 command that generates
            exactly the route/layout types without a full build. Fixes it everywhere the script
            runs (CI, a fresh clone, or `rm -rf .next` locally), not just in ci.yml. Also bumped
            `actions/checkout@v4`→`v5` and `actions/setup-node@v4`→`v6` to clear a secondary,
            non-blocking warning about the actions' own runtime (Node 24) — unrelated to the app's
            own `node-version: 20` build target, which was left as-is.
Files:      package.json, .github/workflows/ci.yml.
Test:       Reproduced locally first (`rm -rf .next next-env.d.ts && npm run typecheck` failed
            with the exact CI error), then confirmed the fix resolves it from that same clean
            state, then ran the full CI-equivalent sequence (lint, typecheck, format:check, test,
            build) from clean — all green. Pushed and confirmed the next GitHub Actions run
            actually succeeded via the same API check used to find the problem.
Status:     RESOLVED — 2026-09-11.
Recurrence: LOW now that the fix lives in the npm script itself rather than only in CI config.
            Process lesson: check actual CI status (the public Actions API works without `gh`)
            periodically, not just local runs — a warm local `.next/` cache can hide exactly this
            class of bug indefinitely.
```

```
BUG #002 · 2026-09-11
Problem:    `npm test` failed intermittently/order-dependently: some auth tests threw EnvError
            ("DATABASE_URL/SESSION_SECRET/TOKEN_ENCRYPTION_KEY: expected string, received
            undefined") even though `.env` has valid values and the same tests passed in
            isolation.
Module:     Test tooling (vitest.config.ts), src/modules/auth/tokens.test.ts.
Root cause: Two compounding issues. (1) Vitest does not auto-load `.env` into `process.env` —
            unlike Next.js and unlike prisma.config.ts (which explicitly does
            `import "dotenv/config"`), plain `vitest run` leaves process.env exactly as the
            shell provided it. (2) tokens.test.ts set process.env.* directly in a beforeAll and
            restored the pre-test snapshot in afterAll; since Vitest can schedule multiple test
            files onto the same worker thread, that restore wiped env vars a later file in the
            same thread depended on — explaining why failures depended on file execution order.
Fix:        Added `vitest.setup.ts` (`import "dotenv/config"`) and registered it via
            `test.setupFiles` in vitest.config.ts, so env is loaded explicitly and once per
            worker — matching how prisma.config.ts already does it. Rewrote tokens.test.ts to
            rely on that ambient env instead of mutating process.env itself.
Files:      vitest.config.ts, vitest.setup.ts (new), src/modules/auth/tokens.test.ts.
Test:       `npm test` run 3x consecutively: 7/7 files, 36/36 tests passing every time.
Status:     RESOLVED — 2026-09-11.
Recurrence: MEDIUM if a future test mutates process.env directly instead of passing explicit
            fixtures (see env.test.ts for the safe pattern: pass values into parseEnv(), don't
            touch process.env/getEnv()). Worth a lint rule or code-review reminder later.
```

```
BUG #001 · 2026-09-11
Problem:    `git push -u origin main` fails: 403 "Permission to
            VikyHari/social-media-management.git denied to vigneshAvironix12".
Module:     Git / GitHub access (not application code).
Root cause: The remote `origin` points to https://github.com/VikyHari/social-media-management.git,
            owned by GitHub user VikyHari. The credential Git Credential Manager was presenting
            authenticated as `vigneshAvironix12`, which had no write access to that repository.
            An `erase` of the cached credential did not help on its own, because Git Credential
            Manager's browser-based login silently reused an already-signed-in GitHub session
            in the default browser rather than prompting for a different account.
Fix:        User manually signed into Git Credential Manager as an account with write access to
            VikyHari/social-media-management (outside this session), then the push was retried.
Files:      None (no code change; git/credential configuration only).
Test:       `git push -u origin main` succeeded — origin/main now has both commits.
Status:     RESOLVED — 2026-09-11.
Recurrence: LOW — access/identity is a one-time fix, not a recurring code defect.
```
