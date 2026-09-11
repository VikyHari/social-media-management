# ROADMAP

Legend: [x] done · [~] in progress · [ ] pending

**UI note:** the phases below are backend/capability-oriented (per the master spec) and don't
carry their own "build the UI" checkbox. A first real UI now exists — login/signup, a dashboard
hub, and the onboarding chat — covering the Phase 1 + Phase 2 capabilities built so far. See
`.ai/file-map.md`'s `## app/` section. Each later phase will likely want its own UI slice; note it
in that phase's section (or here) rather than assuming "phase done" implies "UI for it exists".

## PHASE 0 — FOUNDATION

- [x] Environment inspection
- [x] Next.js scaffold (TS, Tailwind, ESLint)
- [x] Git remote configured
- [x] Docker PostgreSQL
- [x] Env validation + `.env.example`
- [x] Prettier / Vitest / CI
- [x] `.ai/` project memory
- [x] Prisma schema + first migration
- [x] Health endpoint (app + DB)
- [x] CLAUDE.md + README
- [x] First commit + push

## PHASE 1 — CREATOR INTELLIGENCE

- [x] Authentication (email + password, DB sessions)
- [x] AI client module (Claude, structured output, cost logging)
- [x] Onboarding interview (adaptive questions)
- [x] Creator profile (structured, AI-maintained)
- [x] Goals
- [ ] Niche analysis (dedicated feature — interview only lightly challenges scattered/unrealistic niches inline, Part 41)
- [ ] Audience analysis (needs either real platform data (Phase 2/3) or a dedicated qualitative pass)

## PHASE 2 — SOCIAL CONNECTION

- [x] Encrypted token storage
- [x] Instagram OAuth (Meta Graph API) — built, not live-verified (no META_APP_ID yet)
- [x] Facebook OAuth (Meta Graph API) — built, not live-verified (no META_APP_ID yet)
- [x] YouTube OAuth (Google) — built, not live-verified (no GOOGLE_CLIENT_ID yet)
- [ ] Metrics ingestion + sync scheduler
- [x] Connection status / disconnect flow

## PHASE 3 — ANALYTICS

- [ ] Dashboard (what happened / why / what to do)
- [ ] Growth metrics engine (deterministic)
- [ ] Content performance tracking
- [ ] AI analysis (observed / calculated / inferred / predicted)

## PHASE 4 — CONTENT ENGINE

- [ ] Content pillars
- [ ] Ideas, hooks, scripts, captions
- [ ] Platform adaptation
- [ ] Content calendar + workflow states

## PHASE 5 — AI MARKETING MANAGER

- [ ] Daily priorities / briefing
- [ ] Notifications (what / why / action)
- [ ] Recommendations with confidence
- [ ] Weekly + monthly reports (KEEP / STOP / START / TEST)

## PHASE 6 — INTELLIGENCE

- [ ] Competitor analysis (official/public data only)
- [ ] Content gaps
- [ ] Experiments (A/B, SUPPORTED / REJECTED / INCONCLUSIVE)
- [ ] Trend analysis

## PHASE 7 — AUTOMATION

- [ ] Approval workflow
- [ ] Scheduling
- [ ] Approved publishing
- [ ] Comment assistance
- [ ] Repurposing
