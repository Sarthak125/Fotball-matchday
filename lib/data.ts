import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LEAGUE_IDS } from "./config";
import type { Fixture, PlayerProfile, StandingsResponse, TeamInfo } from "./types";

// Reads the data that scripts/fetch-data.mjs saved into ./data.
// Used only while building the static site.

const DATA_DIR = path.join(process.cwd(), "data");
const memo = new Map<string, unknown>();

function read<T>(file: string, fallback: T): T {
  if (memo.has(file)) return memo.get(file) as T;
  let value: T = fallback;
  try {
    value = JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    // Missing files are normal before the first successful fetch.
  }
  memo.set(file, value);
  return value;
}

export interface Meta {
  lastRun?: string;
  lastError?: string | null;
  demo?: boolean;
  window?: { from: string; to: string; today: string; timezone: string; season: number };
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string;
  photo: string;
}

export const getMeta = () => read<Meta>("meta.json", {});
export const getWindowFixtures = (league: number) => read<Fixture[]>(`window/${league}.json`, []);
export const getStandings = (league: number) => read<StandingsResponse | null>(`standings/${league}.json`, null);
export const getTopScorers = (league: number) => read<PlayerProfile[]>(`topscorers/${league}.json`, []);
export const getTopAssists = (league: number) => read<PlayerProfile[]>(`topassists/${league}.json`, []);
export const getSeasonFixtures = (league: number) => read<Fixture[]>(`season/${league}.json`, []);
export const getLeagueTeams = (league: number) => read<TeamInfo[]>(`teams/${league}.json`, []);
const getDetails = () => read<Record<string, Fixture>>("details.json", {});
const getSquads = () => read<Record<string, SquadPlayer[]>>("squads.json", {});

export function getSquad(teamId: number): SquadPlayer[] {
  return getSquads()[teamId] ?? [];
}

/** Every fixture we know about, de-duplicated. Detailed versions win over plain ones. */
let fixturesCache: Fixture[] | null = null;
export function allFixtures(): Fixture[] {
  if (fixturesCache) return fixturesCache;
  const map = new Map<number, Fixture>();
  for (const l of LEAGUE_IDS) {
    for (const f of getSeasonFixtures(l)) map.set(f.fixture.id, f);
    for (const f of getWindowFixtures(l)) map.set(f.fixture.id, f);
  }
  for (const f of Object.values(getDetails())) map.set(f.fixture.id, f);
  fixturesCache = [...map.values()];
  return fixturesCache;
}

export function getFixture(id: number): Fixture | null {
  const detail = getDetails()[id];
  if (detail) return detail;
  return allFixtures().find((f) => f.fixture.id === id) ?? null;
}

export function teamFixtures(teamId: number): Fixture[] {
  return allFixtures()
    .filter((f) => f.teams.home.id === teamId || f.teams.away.id === teamId)
    .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
}

/** Teams that get a page: everyone in the covered competitions' tables. */
let teamCache: Map<number, { id: number; name: string; logo: string; leagues: number[] }> | null = null;
export function teamIndex(): Map<number, { id: number; name: string; logo: string; leagues: number[] }> {
  if (teamCache) return teamCache;
  const map = new Map<number, { id: number; name: string; logo: string; leagues: number[] }>();
  for (const l of LEAGUE_IDS) {
    for (const row of (getStandings(l)?.league.standings ?? []).flat()) {
      const cur = map.get(row.team.id) ?? { id: row.team.id, name: row.team.name, logo: row.team.logo, leagues: [] };
      if (!cur.leagues.includes(l)) cur.leagues.push(l);
      map.set(row.team.id, cur);
    }
  }
  teamCache = map;
  return map;
}

export function teamInfo(teamId: number): TeamInfo | null {
  for (const l of LEAGUE_IDS) {
    const t = getLeagueTeams(l).find((x) => x.team.id === teamId);
    if (t) return t;
  }
  return null;
}

/** Players that get a page: the top scorers and assist leaders, with their stats per competition. */
let playerCache: Map<number, PlayerProfile> | null = null;
export function playerIndex(): Map<number, PlayerProfile> {
  if (playerCache) return playerCache;
  const map = new Map<number, PlayerProfile>();
  for (const l of LEAGUE_IDS) {
    for (const p of [...getTopScorers(l), ...getTopAssists(l)]) {
      const cur = map.get(p.player.id);
      if (!cur) {
        map.set(p.player.id, { player: p.player, statistics: [...p.statistics] });
        continue;
      }
      for (const s of p.statistics) {
        if (!cur.statistics.some((x) => x.league.id === s.league.id && x.team.id === s.team.id)) cur.statistics.push(s);
      }
    }
  }
  playerCache = map;
  return map;
}

export function hasTeamPage(id: number) {
  return teamIndex().has(id);
}

export function hasPlayerPage(id: number | null | undefined) {
  return id != null && playerIndex().has(id);
}
