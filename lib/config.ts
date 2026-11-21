// Competitions covered by the dashboard. IDs are API-Football league IDs.
export const LEAGUES = [
  { id: 39, name: "Premier League", short: "PL", country: "England" },
  { id: 140, name: "La Liga", short: "LL", country: "Spain" },
  { id: 2, name: "Champions League", short: "UCL", country: "Europe" },
] as const;

export type LeagueId = (typeof LEAGUES)[number]["id"];

export const LEAGUE_IDS: readonly number[] = LEAGUES.map((l) => l.id);

export function isCoveredLeague(id: number): boolean {
  return LEAGUE_IDS.includes(id);
}

export function leagueById(id: number) {
  return LEAGUES.find((l) => l.id === id);
}

export function appTimezone(): string {
  const tz = process.env.APP_TIMEZONE?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export function liveRefreshSeconds(): number {
  const n = Number(process.env.LIVE_REFRESH_SECONDS);
  return Number.isFinite(n) && n >= 15 ? Math.floor(n) : 60;
}

/** Today's date (YYYY-MM-DD) in the app time zone. */
export function todayIso(tz = appTimezone()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Shift a YYYY-MM-DD date by a number of days. */
export function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * API-Football identifies a season by the year it starts in.
 * European seasons start in July or August, so before July we are still in last year's season.
 */
export function currentSeason(date = new Date()): number {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 6 ? year : year - 1;
}

export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, "0")}`;
}
