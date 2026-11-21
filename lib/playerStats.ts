import type { PlayerSeasonStats } from "./types";

export interface PlayerTotals {
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOn: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;
  dribbles: number;
  yellow: number;
  red: number;
  rating: number | null; // minutes-weighted average
}

export function totals(stats: PlayerSeasonStats[]): PlayerTotals {
  const t: PlayerTotals = { apps: 0, minutes: 0, goals: 0, assists: 0, shots: 0, shotsOn: 0, keyPasses: 0, tackles: 0, interceptions: 0, duelsWon: 0, dribbles: 0, yellow: 0, red: 0, rating: null };
  let ratingMinutes = 0;
  let ratingSum = 0;
  for (const s of stats) {
    const mins = s.games.minutes ?? 0;
    t.apps += s.games.appearences ?? 0;
    t.minutes += mins;
    t.goals += s.goals.total ?? 0;
    t.assists += s.goals.assists ?? 0;
    t.shots += s.shots.total ?? 0;
    t.shotsOn += s.shots.on ?? 0;
    t.keyPasses += s.passes.key ?? 0;
    t.tackles += s.tackles.total ?? 0;
    t.interceptions += s.tackles.interceptions ?? 0;
    t.duelsWon += s.duels.won ?? 0;
    t.dribbles += s.dribbles.success ?? 0;
    t.yellow += s.cards.yellow ?? 0;
    t.red += (s.cards.red ?? 0) + (s.cards.yellowred ?? 0);
    const r = s.games.rating ? Number(s.games.rating) : NaN;
    if (Number.isFinite(r) && mins > 0) {
      ratingSum += r * mins;
      ratingMinutes += mins;
    }
  }
  t.rating = ratingMinutes > 0 ? ratingSum / ratingMinutes : null;
  return t;
}
