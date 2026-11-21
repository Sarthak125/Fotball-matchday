import "server-only";
import { appTimezone, currentSeason } from "./config";
import type {
  Fixture,
  PlayerProfile,
  SquadResponse,
  StandingsResponse,
  TeamInfo,
  TeamSeasonStats,
  TransferResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";

export class MissingApiKeyError extends Error {
  constructor() {
    super("API_FOOTBALL_KEY is not set.");
    this.name = "MissingApiKeyError";
  }
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  errors: unknown;
  results: number;
  response: T;
}

// Small in-process cache. It saves daily API quota by sharing responses between
// visitors and page loads. Only successful responses are cached.
type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 500;

function baseUrl(): string {
  const raw = process.env.API_FOOTBALL_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

function errorMessage(errors: unknown): string | null {
  if (!errors) return null;
  if (Array.isArray(errors)) return errors.length ? errors.map(String).join("; ") : null;
  if (typeof errors === "object") {
    const values = Object.values(errors as Record<string, unknown>).map(String);
    return values.length ? values.join("; ") : null;
  }
  return String(errors);
}

async function request<T>(path: string, params: Record<string, string | number>, ttlSeconds: number): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (!key) throw new MissingApiKeyError();

  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const cacheKey = url.toString();

  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const pending = inflight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "x-apisports-key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ApiError("Could not reach the football data service. Please try again shortly.");
    }
    if (!res.ok) {
      throw new ApiError(`The football data service returned an error (HTTP ${res.status}).`, res.status);
    }
    const body = (await res.json()) as Envelope<T>;
    const msg = errorMessage(body.errors);
    if (msg) throw new ApiError(msg);

    if (cache.size >= MAX_CACHE_ENTRIES) {
      const now = Date.now();
      for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    }
    cache.set(cacheKey, { expires: Date.now() + ttlSeconds * 1000, value: body.response });
    return body.response;
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

export function getFixturesByDate(date: string, isToday: boolean) {
  return request<Fixture[]>("/fixtures", { date, timezone: appTimezone() }, isToday ? MIN : 30 * MIN);
}

export async function getFixture(id: number): Promise<Fixture | null> {
  const list = await request<Fixture[]>("/fixtures", { id, timezone: appTimezone() }, MIN);
  return list[0] ?? null;
}

export function getHeadToHead(homeId: number, awayId: number) {
  return request<Fixture[]>("/fixtures/headtohead", { h2h: `${homeId}-${awayId}`, last: 10, timezone: appTimezone() }, DAY);
}

export async function getStandings(league: number, season = currentSeason()): Promise<StandingsResponse | null> {
  const list = await request<StandingsResponse[]>("/standings", { league, season }, 10 * MIN);
  return list[0] ?? null;
}

export function getTopScorers(league: number, season = currentSeason()) {
  return request<PlayerProfile[]>("/players/topscorers", { league, season }, HOUR);
}

export function getTopAssists(league: number, season = currentSeason()) {
  return request<PlayerProfile[]>("/players/topassists", { league, season }, HOUR);
}

export function getLeagueFixtures(league: number, opts: { next?: number; last?: number }, season = currentSeason()) {
  const params: Record<string, string | number> = { league, season, timezone: appTimezone() };
  if (opts.next) params.next = opts.next;
  if (opts.last) params.last = opts.last;
  return request<Fixture[]>("/fixtures", params, opts.next ? 30 * MIN : 10 * MIN);
}

export async function getTeam(id: number): Promise<TeamInfo | null> {
  const list = await request<TeamInfo[]>("/teams", { id }, DAY);
  return list[0] ?? null;
}

export function getTeamFixtures(team: number, opts: { next?: number; last?: number }) {
  const params: Record<string, string | number> = { team, timezone: appTimezone() };
  if (opts.next) params.next = opts.next;
  if (opts.last) params.last = opts.last;
  return request<Fixture[]>("/fixtures", params, 10 * MIN);
}

export async function getSquad(team: number): Promise<SquadResponse | null> {
  const list = await request<SquadResponse[]>("/players/squads", { team }, DAY);
  return list[0] ?? null;
}

export function getTeamSeasonStats(team: number, league: number, season = currentSeason()) {
  return request<TeamSeasonStats>("/teams/statistics", { team, league, season }, HOUR);
}

export function getTeamTransfers(team: number) {
  return request<TransferResponse[]>("/transfers", { team }, DAY);
}

export async function getPlayer(id: number, season = currentSeason()): Promise<PlayerProfile | null> {
  const list = await request<PlayerProfile[]>("/players", { id, season }, HOUR);
  return list[0] ?? null;
}

/** Turns any thrown error into a message that is safe to show on the page. */
export function describeError(err: unknown): { kind: "setup" | "api"; message: string } {
  if (err instanceof MissingApiKeyError) return { kind: "setup", message: err.message };
  if (err instanceof ApiError) return { kind: "api", message: err.message };
  console.error(err);
  return { kind: "api", message: "Something went wrong while loading football data." };
}
