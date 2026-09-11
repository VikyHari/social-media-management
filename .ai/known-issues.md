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
BUG #001 · 2026-09-11
Problem:    `git push -u origin main` fails: 403 "Permission to
            VikyHari/social-media-management.git denied to vigneshAvironix12".
Module:     Git / GitHub access (not application code).
Root cause: The remote `origin` points to https://github.com/VikyHari/social-media-management.git,
            owned by GitHub user VikyHari. The credential Git Credential Manager is presenting
            authenticates as `vigneshAvironix12`, which has no write access to that repository.
Fix:        Needs a decision only the user can make — one of:
              1. VikyHari grants vigneshAvironix12 (or a team/org) collaborator write access, or
              2. Point `origin` at a repo vigneshAvironix12 owns/has write access to
                 (`git remote set-url origin <new-url>`), or
              3. Re-authenticate Git Credential Manager as an account with push access to
                 VikyHari/social-media-management (`git credential-manager github logout`, then
                 push again to trigger a fresh login).
Files:      None (no code change; git configuration only).
Test:       `git push -u origin main` succeeds without a 403.
Status:     OPEN — blocked on user input, see Part 67 (credentials/access decision).
Recurrence: LOW once resolved — access/URL is a one-time fix, not a recurring code defect.
```

## Resolved

(none)
