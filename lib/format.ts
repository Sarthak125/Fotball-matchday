import type { Fixture, FixtureEvent } from "./types";

const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"]);
const FINISHED = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const OFF = new Set(["PST", "CANC", "ABD"]);

export type MatchState = "live" | "finished" | "scheduled" | "off";

export function matchState(f: Fixture): MatchState {
  const s = f.fixture.status.short;
  if (LIVE.has(s)) return "live";
  if (FINISHED.has(s)) return "finished";
  if (OFF.has(s)) return "off";
  return "scheduled";
}

/** Short status label, for example 67′, HT, FT, PST. Scheduled matches return null (show kick-off time instead). */
export function statusLabel(f: Fixture): string | null {
  const { short, elapsed, extra } = f.fixture.status;
  if (short === "HT" || short === "BT" || short === "P" || short === "INT" || short === "SUSP") return short;
  if (LIVE.has(short)) {
    if (elapsed == null) return "LIVE";
    return extra ? `${elapsed}+${extra}′` : `${elapsed}′`;
  }
  if (FINISHED.has(short) || OFF.has(short)) return short;
  return null;
}

export function ratingColor(rating: number | null | undefined): string {
  if (rating == null || Number.isNaN(rating)) return "var(--muted-bg)";
  if (rating >= 8) return "var(--r-great)";
  if (rating >= 7) return "var(--r-good)";
  if (rating >= 6) return "var(--r-ok)";
  return "var(--r-poor)";
}

export function parseRating(r: string | null | undefined): number | null {
  if (r == null) return null;
  const n = Number(r);
  return Number.isFinite(n) ? n : null;
}

/** Turns a stat value such as "58%" or "1.84" or 7 into a number for bar widths. */
export function statNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(v.replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

export function eventTag(e: FixtureEvent): { tag: string; tone: "goal" | "yellow" | "red" | "sub" | "var" | "other" } {
  const type = e.type.toLowerCase();
  if (type === "goal") {
    if (e.detail === "Missed Penalty") return { tag: "MISS", tone: "other" };
    return { tag: e.detail === "Own Goal" ? "OG" : "GOAL", tone: "goal" };
  }
  if (type === "card") return e.detail.toLowerCase().includes("red") ? { tag: "RC", tone: "red" } : { tag: "YC", tone: "yellow" };
  if (type === "subst") return { tag: "SUB", tone: "sub" };
  if (type === "var") return { tag: "VAR", tone: "var" };
  return { tag: e.type.slice(0, 4).toUpperCase(), tone: "other" };
}

export function eventMinute(e: FixtureEvent): string {
  return e.time.extra ? `${e.time.elapsed}+${e.time.extra}′` : `${e.time.elapsed}′`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

export function per90(value: number | null | undefined, minutes: number | null | undefined): number | null {
  if (value == null || !minutes) return null;
  return (value / minutes) * 90;
}

export function initials(name: string): string {
  const parts = name.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Weekday and day labels for a calendar date (YYYY-MM-DD). */
export function formatDateLabel(iso: string): { dow: string; day: string } {
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    dow: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d),
    day: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d),
  };
}

export function formatKickoff(isoDateTime: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(isoDateTime));
}

export function formatLongDate(isoDateTime: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(isoDateTime));
}

export function formatShortDate(isoDateTime: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(isoDateTime));
}
