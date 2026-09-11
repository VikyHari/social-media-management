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

(none)

## Resolved

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
