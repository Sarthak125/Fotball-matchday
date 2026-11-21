# Matchday

A football dashboard for the **Premier League, La Liga and Champions League**, published as a static site on **GitHub Pages**. It works on laptops and Android tablets (and phones).

Data comes from [API-Football](https://www.api-football.com).

## How it works

GitHub Pages can only host fixed files, so the site is rebuilt on a schedule:

1. A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs **every 3 hours**, on every push to `main`, and whenever you start it by hand.
2. `scripts/fetch-data.mjs` downloads the latest data using your API key, which is stored as a GitHub secret. The key is only used inside GitHub Actions. It is never put into the website.
3. Next.js builds the pages from that data and the workflow publishes them to GitHub Pages.

This means **scores are not live**. They are as fresh as the last run, and every page shows when the data was last updated. GitHub can start scheduled runs late, especially at busy times.

Data that changes slowly (squads, season fixtures, top scorers) is kept between runs in the GitHub Actions cache and refreshed only when it gets old. Each run stays within a call budget so the daily API quota is not used up.

## Features

| Page | What it shows |
|---|---|
| **Matches** | 7-day picker, matches grouped by competition, filters (All, Live, By time, Following), top match card, Premier League mini table, today's summary. |
| **Match Centre** | Scoreboard with scorers and xG (when provided). Tabs: Facts (top stats, events, top-rated player, match info), Lineup (formations on a pitch with player ratings), Stats, Head-to-head (this season), Table. |
| **League** | Table with All / Home / Away views, form and qualification zones; upcoming fixtures and recent results; top scorers and assists. |
| **Team** | Position and season numbers per competition, recent results, upcoming matches, club info, squad. Follow button. |
| **Player** | Profile, totals, stats by competition, per-90 numbers. Available for the top scorers and assist leaders in each competition. |
| **Compare** | Two players side by side, per 90 or season totals. |
| **Lineup Builder** | Pick a team and formation, choose a player per position, copy the lineup as text. |

Followed teams and saved lineups are stored in the visitor's browser (there are no accounts).

### Limits of the static version

- Match details (events, lineups, stats, ratings) are fetched for matches in the 7-day window. Older matches show the score only.
- Head-to-head covers this season's meetings in the three competitions.
- Player pages exist for the top scorers and assist leaders only. Other players are shown without a link.
- Squads are downloaded a few teams per run, so it takes a few days after setup before every team has one.
- Not available from API-Football: momentum graph, shot maps, live win probability, live commentary, news, TV listings, transfer rumours.

## Setting up GitHub Pages (one time)

1. **Make the repository public** (Settings → General → Danger Zone → Change visibility). On a free GitHub account, Pages only works for public repositories. The code contains no secrets.
2. **Turn on Pages**: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. **Add your API key**: Settings → Secrets and variables → Actions → New repository secret. Name `API_FOOTBALL_KEY`, value: your key from the API-Football dashboard. Sign up directly at API-Football, not through RapidAPI, because RapidAPI keys work differently.
4. **Run it**: Actions tab → "Update data and deploy" → Run workflow.

The site will be at `https://<your-username>.github.io/<repository-name>/`.

### Optional settings

Under Settings → Secrets and variables → Actions → **Variables**:

| Variable | Default | Purpose |
|---|---|---|
| `APP_TIMEZONE` | `UTC` | Decides which fixtures count as "today", for example `Asia/Kolkata`. Kick-off times always show in each visitor's own time zone. |
| `MAX_CALLS_PER_RUN` | `12` | API calls allowed per run. Raise it on a paid plan. |
| `USE_DEMO_DATA` | (not set) | Set to `true` to publish the built-in demo data (fictional teams and players) instead of real data, for example before you have a key. The site shows a demo banner. Remove it once your key is set. |

To change how often the site updates, edit the `cron` line in `.github/workflows/deploy.yml`.

## API quota

- API-Football's free plan allows **100 requests a day**. The defaults (every 3 hours, up to 12 calls a run) stay under that. Each run also stops early if the provider reports that few calls are left for the day.
- For fresher scores, use a paid plan, raise `MAX_CALLS_PER_RUN`, and run the workflow more often. Check current prices and limits on API-Football's site, because they change.
- I could not confirm whether the free plan includes the current season. If it does not, the workflow log shows the provider's error and the pages stay empty.

## Running locally

Requirements: Node.js 20 or newer.

```bash
npm install
```

With a real key (keep it out of git; `data/` is ignored):

```bash
API_FOOTBALL_KEY=your-key npm run fetch-data && npm run dev
```

With the demo data instead:

```bash
node dev/mock-server.mjs
```

In a second terminal:

```bash
API_FOOTBALL_KEY=demo API_FOOTBALL_BASE_URL=http://127.0.0.1:4010 MIN_INTERVAL_MS=0 MAX_CALLS_PER_RUN=100 DEMO_DATA=true npm run fetch-data && npm run dev
```

Type check: `npm run lint`. Production build: `npm run build` (output in `out/`).

## Project layout

```
.github/workflows/deploy.yml   scheduled data update and Pages deployment
scripts/fetch-data.mjs         downloads data into ./data within a call budget
app/                           pages (static export)
components/                    UI pieces (navigation, pitch, stat bars, tabs, follow button...)
lib/data.ts                    reads ./data while building
lib/config.ts                  covered competitions, season and time zone helpers
dev/mock-server.mjs            local mock of the API with fictional data
```
