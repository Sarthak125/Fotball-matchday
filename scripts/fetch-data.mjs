// Fetches football data from API-Football into ./data so the static site can be built.
//
// Runs in GitHub Actions on a schedule. The API key comes from the API_FOOTBALL_KEY
// secret and is only used here, at build time. It never reaches the browser.
//
// The ./data folder is kept between runs (GitHub Actions cache), so slow-changing
// data (squads, season fixtures, top scorers) is refreshed only when it is old.
// Every run stays within a call budget so the daily API quota is not exceeded.
//
// Environment:
//   API_FOOTBALL_KEY         required
//   API_FOOTBALL_BASE_URL    optional, for local testing against dev/mock-server.mjs
//   APP_TIMEZONE             optional, IANA time zone (default UTC)
//   MAX_CALLS_PER_RUN        optional, default 12
//   MIN_REMAINING_DAILY      optional, stop when the provider says fewer calls remain today (default 5)
//   MIN_INTERVAL_MS          optional, pause between calls to respect per-minute limits (default 6500)
//   DEMO_DATA                optional, "true" marks the data as demo data
//   SEASON                   optional, start year of the season to show (e.g. 2024 for 2024/25).
//                            Defaults to the current season. Free API plans only cover older seasons.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const LEAGUES = [39, 140, 2];
const DATA_DIR = path.resolve("data");
const PUBLIC_DATA_DIR = path.resolve("public", "data");
const BASE_URL = (process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io").replace(/\/+$/, "");
const KEY = (process.env.API_FOOTBALL_KEY || "").trim();
const MAX_CALLS = intEnv("MAX_CALLS_PER_RUN", 12, 1);
const MIN_REMAINING = intEnv("MIN_REMAINING_DAILY", 5, 0);
const MIN_INTERVAL_MS = intEnv("MIN_INTERVAL_MS", 6500, 0);
const HOUR = 3600_000;

function intEnv(name, fallback, min) {
  const raw = (process.env[name] ?? "").trim();
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
}

function timezone() {
  const tz = (process.env.APP_TIMEZONE || "UTC").trim();
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    console.warn(`APP_TIMEZONE "${tz}" is not valid, using UTC.`);
    return "UTC";
  }
}

const TZ = timezone();

function isoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shift(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function currentSeason(d = new Date()) {
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

// ---------- storage ----------

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value, dir = DATA_DIR) {
  const full = path.join(dir, file);
  await mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.tmp`;
  await writeFile(tmp, JSON.stringify(value));
  await rename(tmp, full);
}

// ---------- API client with budget ----------

let calls = 0;
let lastCall = 0;
let dailyRemaining = null;
let stopReason = null;
let planError = null;
let successes = 0;

class BudgetExhausted extends Error {}

function canCall() {
  if (stopReason) return false;
  if (calls >= MAX_CALLS) {
    stopReason = `reached MAX_CALLS_PER_RUN (${MAX_CALLS})`;
    return false;
  }
  if (dailyRemaining != null && dailyRemaining <= MIN_REMAINING) {
    stopReason = `provider reports ${dailyRemaining} calls left today`;
    return false;
  }
  return true;
}

async function api(pathname, params) {
  if (!canCall()) throw new BudgetExhausted(stopReason);
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const url = new URL(BASE_URL + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  calls++;
  lastCall = Date.now();
  const res = await fetch(url, { headers: { "x-apisports-key": KEY }, signal: AbortSignal.timeout(20_000) });
  const remaining = Number(res.headers.get("x-ratelimit-requests-remaining"));
  if (Number.isFinite(remaining) && res.headers.has("x-ratelimit-requests-remaining")) dailyRemaining = remaining;
  if (!res.ok) throw new Error(`${pathname} returned HTTP ${res.status}`);
  const body = await res.json();
  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  if (errors && errors.length) {
    const msg = errors.map(String).join("; ");
    // The plan does not cover this season: every further call would fail too, so stop now.
    if (/do not have access|plan/i.test(msg)) {
      planError = msg;
      stopReason = msg;
      throw new BudgetExhausted(msg);
    }
    // Daily or per-minute limit reached: stop cleanly and keep what we have.
    if (/limit|requests/i.test(msg)) {
      stopReason = msg;
      throw new BudgetExhausted(msg);
    }
    throw new Error(`${pathname}: ${msg}`);
  }
  successes++;
  return body.response;
}

// ---------- tasks ----------

const meta = await readJson("meta.json", { fetchedAt: {} });
meta.fetchedAt ||= {};
const now = Date.now();
const age = (key) => (meta.fetchedAt[key] ? now - meta.fetchedAt[key] : Infinity);
const mark = (key) => (meta.fetchedAt[key] = Date.now());
const problems = [];

async function task(label, fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    if (err instanceof BudgetExhausted) return false;
    problems.push(`${label}: ${err.message}`);
    console.warn(`! ${label}: ${err.message}`);
    return false;
  }
}

const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"]);
const FINISHED = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

async function main() {
  if (!KEY) {
    console.error("API_FOOTBALL_KEY is not set. Skipping data fetch; the site will build without data.");
    await finish(false);
    return;
  }
  const forced = Number((process.env.SEASON || "").trim());
  const season = Number.isInteger(forced) && forced >= 2000 && forced <= 2100 ? forced : currentSeason();
  const today = isoToday();
  // If the season changed since the last run, refetch everything season-specific.
  if (meta.window?.season != null && meta.window.season !== season) {
    for (const k of Object.keys(meta.fetchedAt)) if (!k.startsWith("squad/")) delete meta.fetchedAt[k];
    for (const dir of ["window", "standings", "teams", "topscorers", "season", "topassists"]) {
      for (const league of LEAGUES) await writeJson(`${dir}/${league}.json`, dir === "standings" ? null : []);
    }
    await writeJson("details.json", {});
  }
  const from = shift(today, -3);
  const to = shift(today, 3);
  console.log(`Season ${season}, window ${from} to ${to} (${TZ}), budget ${MAX_CALLS} calls.`);

  // 1. Fixtures for the 7-day window, one call per league. Every run.
  for (const league of LEAGUES) {
    await task(`window fixtures ${league}`, async () => {
      const list = await api("/fixtures", { league, season, from, to, timezone: TZ });
      await writeJson(`window/${league}.json`, list);
      mark(`window/${league}`);
    });
  }
  meta.window = { from, to, today, timezone: TZ, season };

  // 2. Standings. Every run (they change after every match).
  for (const league of LEAGUES) {
    await task(`standings ${league}`, async () => {
      const list = await api("/standings", { league, season });
      await writeJson(`standings/${league}.json`, list[0] ?? null);
      mark(`standings/${league}`);
    });
  }

  // 3. Match details (events, lineups, stats, ratings) for matches that need them.
  const details = await readJson("details.json", {});
  const windowFixtures = [];
  for (const league of LEAGUES) windowFixtures.push(...(await readJson(`window/${league}.json`, [])));
  const soon = now + 2 * HOUR;
  const need = windowFixtures
    .filter((f) => {
      const short = f.fixture.status.short;
      const have = details[f.fixture.id];
      if (LIVE.has(short)) return true;
      if (FINISHED.has(short)) return !have || !FINISHED.has(have.fixture.status.short);
      // Lineups appear about an hour before kick-off.
      return f.fixture.timestamp * 1000 <= soon && f.fixture.timestamp * 1000 > now && !(have && have.lineups && have.lineups.length);
    })
    .map((f) => f.fixture.id);
  for (let i = 0; i < need.length; i += 20) {
    const ids = need.slice(i, i + 20);
    await task(`details ${ids.join(",")}`, async () => {
      const list = await api("/fixtures", { ids: ids.join("-"), timezone: TZ });
      for (const f of list) details[f.fixture.id] = f;
    });
  }
  // Keep details for this season only.
  for (const [id, f] of Object.entries(details)) if (f.league?.season !== season) delete details[id];
  await writeJson("details.json", details);

  // 4. Slow data, refreshed when older than 12 hours.
  for (const league of LEAGUES) {
    for (const [kind, apiPath, params] of [
      ["teams", "/teams", { league, season }],
      ["topscorers", "/players/topscorers", { league, season }],
      ["season", "/fixtures", { league, season, timezone: TZ }],
      ["topassists", "/players/topassists", { league, season }],
    ]) {
      const key = `${kind}/${league}`;
      if (age(key) < 12 * HOUR) continue;
      await task(key, async () => {
        const list = await api(apiPath, params);
        await writeJson(`${key}.json`, list);
        mark(key);
      });
    }
  }

  // 5. Squads for every team in the covered competitions, oldest first, weekly.
  const squads = await readJson("squads.json", {});
  const teamIds = new Set();
  for (const league of LEAGUES) {
    const st = await readJson(`standings/${league}.json`, null);
    for (const row of (st?.league?.standings ?? []).flat()) teamIds.add(row.team.id);
  }
  const queue = [...teamIds]
    .filter((id) => age(`squad/${id}`) > 7 * 24 * HOUR)
    .sort((a, b) => (meta.fetchedAt[`squad/${a}`] ?? 0) - (meta.fetchedAt[`squad/${b}`] ?? 0));
  for (const id of queue) {
    if (!canCall()) break;
    await task(`squad ${id}`, async () => {
      const list = await api("/players/squads", { team: id });
      squads[id] = (list[0]?.players ?? []).map((p) => ({ id: p.id, name: p.name, age: p.age, number: p.number, position: p.position, photo: p.photo }));
      mark(`squad/${id}`);
    });
  }
  await writeJson("squads.json", squads);

  await finish(true);
}

async function finish(fetched) {
  // Only count the run as an update if at least one request worked.
  if (fetched && successes > 0) meta.lastRun = new Date().toISOString();
  meta.lastAttempt = new Date().toISOString();
  meta.lastError = !KEY ? "API_FOOTBALL_KEY is not set." : planError ?? (successes === 0 && problems.length ? problems[0] : null);
  meta.demo = process.env.DEMO_DATA === "true";
  meta.lastRunCalls = calls;
  meta.lastRunProblems = problems;
  await writeJson("meta.json", meta);

  // Squads are also published as a static file for the Lineup Builder.
  const squads = await readJson("squads.json", {});
  await writeJson("squads.json", squads, PUBLIC_DATA_DIR);

  console.log(`Used ${calls} API calls.${dailyRemaining != null ? ` Provider reports ${dailyRemaining} left today.` : ""}`);
  if (stopReason) console.log(`Stopped early: ${stopReason}. Remaining items will be fetched on later runs.`);
  if (problems.length) console.log(`${problems.length} request(s) failed; see warnings above.`);
}

await main();
