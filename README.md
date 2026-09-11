# AI Creator Growth Manager

An AI-powered digital marketing manager for one content creator. It learns who the creator is,
connects Instagram, Facebook and YouTube through official APIs, analyses performance with
deterministic metrics, and uses Claude to explain what happened, why, and what to do next.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind v4 · PostgreSQL 16 · Prisma 7 · Zod · Claude API ·
Vitest · ESLint + Prettier · GitHub Actions

## Local setup

```bash
cp .env.example .env            # then fill in secrets (openssl rand -hex 32)
docker compose up -d            # PostgreSQL on localhost:5433
npm install                     # also runs prisma generate
npm run db:migrate              # apply migrations
npm run dev                     # http://localhost:3000  (health: /api/health)
```

## Scripts

`dev` `build` `start` `lint` `typecheck` `format` `format:check` `test` `test:watch`
`db:generate` `db:migrate` `db:deploy` `db:studio`

## Project memory

Development state, architecture, roadmap and decisions live in [`.ai/`](.ai/). Start with
[`.ai/project-state.md`](.ai/project-state.md).

## Principles

- Official APIs only; no fake engagement or scraping.
- Deterministic analytics; the LLM interprets and recommends, never calculates.
- Every metric is tagged OBSERVED / CALCULATED / INFERRED / PREDICTED.
- Sensitive actions (publishing, deleting, account changes) require explicit approval.
