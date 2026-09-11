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
docker compose up -d            # PostgreSQL on localhost:5440
npm install                     # also runs prisma generate
npm run db:migrate              # apply migrations
npm run dev                     # http://localhost:3000  (sign up, then see the dashboard)
```

## Scripts

`dev` `build` `start` `lint` `typecheck` `format` `format:check` `test` `test:watch`
`db:generate` `db:migrate` `db:deploy` `db:studio`

## Connecting social accounts

Each platform is its own OAuth setup — they are not interchangeable, and (as of this writing)
Facebook and Instagram use **different credential pairs even though they're the same Meta app**.
Redirect URIs below assume `APP_URL=http://localhost:3000` (the `.env.example` default); change
the host if you deploy somewhere else.

### Facebook

1. Go to [developers.facebook.com](https://developers.facebook.com), sign in, **Create App** (type: Business).
2. Add the **Facebook Login for Business** product. In its settings, add this OAuth redirect URI:
   `http://localhost:3000/api/integrations/facebook/callback`
3. Copy the **App ID** and **App Secret** from _Settings > Basic_ into `.env`:
   `META_APP_ID=...` / `META_APP_SECRET=...`

### Instagram

Instagram is a **separate OAuth flow** ("Instagram Business Login"), not reached through Facebook.
You need an Instagram **Professional** (Business or Creator) account to connect.

1. In the **same** Meta app (or a new one), add the **Instagram** product, then open
   _API setup with Instagram login > Business login settings_.
2. Add this OAuth redirect URI: `http://localhost:3000/api/integrations/instagram/callback`
3. Copy the **Instagram App ID** and **Instagram App Secret** shown there — these are different
   values from the app's main App ID/Secret above — into `.env`:
   `INSTAGRAM_APP_ID=...` / `INSTAGRAM_APP_SECRET=...`

### YouTube

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create or select a project.
2. _APIs & Services > Library_: enable the **YouTube Data API v3**.
3. _APIs & Services > OAuth consent screen_: configure it (External is fine for testing); while
   it's in **Testing** status, add your own Google account under **Test users**.
4. _APIs & Services > Credentials > Create Credentials > OAuth client ID_, type **Web application**.
   Add this authorized redirect URI: `http://localhost:3000/api/integrations/youtube/callback`
5. Copy the **Client ID** and **Client Secret** into `.env`:
   `GOOGLE_CLIENT_ID=...` / `GOOGLE_CLIENT_SECRET=...`

### Before it works for real

Both Meta and Google require a review process before _any_ user can connect through your app.
Until an app passes review, it's in **Development** (Meta) or **Testing** (Google) mode, and only
accounts you've explicitly added as testers/developers (Meta) or test users (Google) — typically
your own account — can complete the OAuth flow. That's expected and fine for verifying the
connection works; submit for review when you're ready for other creators to use it.

Restart `npm run dev` after editing `.env` (env vars are only read at startup). Each platform's
**Connect** button on the dashboard will then redirect to the real consent screen instead of
showing "Not configured yet".

## Project memory

Development state, architecture, roadmap and decisions live in [`.ai/`](.ai/). Start with
[`.ai/project-state.md`](.ai/project-state.md).

## Principles

- Official APIs only; no fake engagement or scraping.
- Deterministic analytics; the LLM interprets and recommends, never calculates.
- Every metric is tagged OBSERVED / CALCULATED / INFERRED / PREDICTED.
- Sensitive actions (publishing, deleting, account changes) require explicit approval.
