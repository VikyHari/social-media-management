@AGENTS.md

# AI Creator Growth Manager — agent protocol

**Read `.ai/project-state.md` first, then `.ai/current-task.md`.** Inspect only the module you are
changing (`.ai/file-map.md`). Decided items live in `.ai/decisions.md` and `.ai/architecture.md`;
do not re-ask them. Repo-wide analysis only for new projects, major refactors, audits, migrations
or unexplained cross-module bugs.

## Development loop

state -> task -> `git status` -> module -> files -> plan -> implement -> test -> lint/typecheck ->
security check -> docs -> update `.ai/` -> review diff -> commit -> push

## Commands

```
npm run dev | build | lint | typecheck | format | format:check | test | test:watch
npm run db:migrate -- --name <name>   # create + apply migration (dev)
npm run db:generate | db:deploy | db:studio
docker compose up -d                  # local PostgreSQL on localhost:5433
```

## Rules

- Never commit `.env` or any secret. `.env.example` carries placeholders only.
- Conventional Commits. No destructive git (reset --hard, force push, history rewrite) without approval.
- Deterministic math lives in `src/modules/analytics`, never in the LLM. LLM output is Zod-validated.
- Every creator-facing metric is tagged OBSERVED / CALCULATED / INFERRED / PREDICTED.
- Official platform APIs only. No scraping, fake engagement, or automation-policy violations.
- Log bugs in `.ai/known-issues.md`. Update `.ai/project-state.md` after every meaningful change.
- Definition of done: code + typecheck + lint + tests + docs + `.ai/` updated + commit + push.
- Tooling note: the Bash tool on this Windows host truncates commands over ~8KB; write one or two files per call.
