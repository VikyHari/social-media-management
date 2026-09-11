# CURRENT TASK

## Task

Phase 1, step 3: creator onboarding interview + creator profile (`src/modules/creator`).

## Type

New feature

## Target module

`src/modules/creator` (new). Consumes `src/modules/ai` (generateStructured, conversation APIs) and
`src/modules/auth` (requires a logged-in user). Touches `prisma/schema.prisma` (new models).

## Relevant files

- src/modules/ai/index.ts (generateStructured, startConversation, addUserMessage/addAssistantMessage — reuse, don't reimplement)
- src/modules/auth/index.ts (getCurrentUser/getSessionToken — reuse for route auth)
- prisma/schema.prisma (add CreatorProfile, Goal models)
- src/modules/creator/{interview,profile,repository,schemas,index}.ts (new)
- src/app/api/creator/onboarding/route.ts (new — start/continue/finish the interview)

## Constraints

- Adaptive interview, not a fixed script: the AI chooses follow-up questions based on prior
  answers (Part 23) — don't hardcode a linear question list. Topics to eventually cover: niche,
  interests, skills, personality, content style, target audience, goals, platforms, equipment,
  budget, time, experience, existing content, competitors admired, language, monetization goals.
  Don't ask irrelevant questions once enough signal exists on a topic.
- Store the raw interview as an AiConversation (purpose: "onboarding") via modules/ai — don't
  build a second conversation-storage mechanism.
- The derived CreatorProfile is structured (Part 24 fields) and produced via generateStructured,
  not by regex/manual parsing of chat text.
- The AI should challenge unrealistic input, not blindly agree (Part 41) — e.g. too many unrelated
  niches, unrealistic goals — but this task only needs the interview + profile extraction to work;
  deeper "challenge the user" reasoning can sharpen in a later pass once real usage exists.
- Requires ANTHROPIC_API_KEY for real interview turns; build + unit tests (mocked AI client, same
  pattern as src/modules/ai/structured.test.ts) must pass without a key. Live verification once a
  key is available — see .ai/project-state.md "Next Recommended Action".

## Expected result

A logged-in user can start an onboarding conversation, exchange several turns, and the system
produces a structured CreatorProfile (+ Goal records) saved to the database. Lint/typecheck/tests/
build pass without a real API key (mocked in tests).

## Validation

`npm run lint && npm run typecheck && npm test && npm run build`, plus new unit tests (mocked AI
client for the interview logic) and integration tests (real DB) for profile persistence. Live
end-to-end smoke test once ANTHROPIC_API_KEY is available.
