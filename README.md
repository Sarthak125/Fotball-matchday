# Matchday

A football dashboard for the **Premier League, La Liga and Champions League**, built with Next.js. It works on laptops and Android tablets (and phones).

Data comes from [API-Football](https://www.api-football.com). The API key stays on the server and is never sent to the browser.

## Features

| Page | What it shows |
|---|---|
| **Matches** (`/`) | Day picker (3 days back, 3 ahead), matches grouped by competition, filters (All, Live, By time, Following), top match card, Premier League mini table, day summary. Refreshes automatically while a match is live. |
| **Match Centre** (`/match/[id]`) | Scoreboard with scorers and xG (when provided). Tabs: Facts (top stats, events, top-rated player, match info), Lineup (formation on a pitch with player ratings, benches, coaches), Stats (every stat the provider returns), Head-to-head, Table. |
| **League** (`/league/[id]`) | Full table with All / Home / Away views, form and qualification zones; fixtures and results; top scorers and assists. |
| **Team** (`/team/[id]`) | Season stats, recent results, upcoming matches, club info, squad, transfers. Follow button. |
| **Player** (`/player/[id]`) | Profile, season totals, stats by competition, per-90 numbers. |
| **Compare** (`/compare`) | Two players side by side, per 90 or season totals. |
| **Lineup Builder** (`/lineup-builder`) | Pick a team and formation, choose a player per position, copy the lineup as text. |

Followed teams and saved lineups are stored in the browser (no accounts yet).

### Not included yet (and why)

These were in the design but need data or infrastructure that API-Football does not provide:

- **Momentum graph, shot maps, heatmaps, live win probability**: not in API-Football. Would need a different data provider or our own model.
- **Live text commentary, news, TV listings, transfer rumours**: need separate sources.
- **Predictor and leaderboards**: need user accounts and a database.
- **Push notifications**: need accounts plus a notification service, or a native Android app.

## Setup

Requirements: Node.js 20 or newer.

1. Create an API-Football account and copy your API key from the dashboard.
2. Install and configure:

   ```bash
   npm install
   cp .env.example .env.local
   ```

   Open `.env.local` and set `API_FOOTBALL_KEY`. Optionally set `APP_TIMEZONE` (for example `Asia/Kolkata`) so "today" matches your audience.

3. Run it:

   ```bash
   npm run dev
   ```

   Then open http://localhost:3000. For production: `npm run build` then `npm start`.

Never commit `.env.local`. It is already in `.gitignore`.

### Settings

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `API_FOOTBALL_KEY` | Yes | none | Your API-Football key. |
| `APP_TIMEZONE` | No | `UTC` | Decides which fixtures count as "today". Kick-off times always display in each viewer's own time zone. |
| `LIVE_REFRESH_SECONDS` | No | `60` | How often open pages refresh during live matches (minimum 15). |
| `API_FOOTBALL_BASE_URL` | No | API-Football | Only for local testing against the mock server. |

## API quota

Each page view needs between 1 and 4 API calls. Responses are cached in the server's memory (live data for 1 minute, tables for 10 minutes, squads and team info for a day), and cached responses are shared between visitors.

- API-Football's free plan allows **100 requests per day**. That is enough to try the app and develop, but not for a live dashboard with regular visitors, especially on match days.
- For real use, a paid plan is needed. Check current prices and limits on their pricing page, because they change.
- Also check whether your plan covers the current season. Some providers restrict free plans to older seasons. If so, the pages show the provider's error message.
- The in-memory cache is per server instance. On serverless hosting each instance has its own cache, so quota use will be higher than on a single long-running server. If quota becomes a problem, add a shared cache such as Redis.

## Deploying

Any host that runs Node.js works, for example Vercel, Render, Railway, or a VPS with `npm run build && npm start`. Set the environment variables in the host's settings, not in the code.

## Testing without an API key

`dev/mock-server.mjs` is a small local server that returns responses in API-Football's format, with fictional teams and players. It is for development only.

```bash
node dev/mock-server.mjs
```

In a second terminal:

```bash
API_FOOTBALL_KEY=test API_FOOTBALL_BASE_URL=http://127.0.0.1:4010 npm run dev
```

Type check: `npm run lint`.

## Project layout

```
app/            pages (App Router) and the /api/squad route used by the Lineup Builder
components/     UI pieces (navigation, pitch, stat bars, tabs, follow button...)
lib/api.ts      API-Football client, caching and error handling (server only)
lib/config.ts   covered competitions, season and time zone helpers
lib/types.ts    response types
dev/            local mock server for testing
```
