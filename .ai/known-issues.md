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
