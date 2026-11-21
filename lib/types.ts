// Types for the parts of the API-Football v3 responses this app uses.
// Fields the provider may omit are marked optional or nullable.

export interface TeamRef {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

export interface FixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
  extra?: number | null;
}

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: TeamRef;
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string;
  comments: string | null;
}

export interface LineupPlayer {
  player: { id: number; name: string; number: number | null; pos: string | null; grid: string | null };
}

export interface Lineup {
  team: TeamRef & { colors?: { player?: { primary?: string; number?: string } } | null };
  coach: { id: number | null; name: string | null };
  formation: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface TeamStatistics {
  team: TeamRef;
  statistics: { type: string; value: number | string | null }[];
}

export interface PlayerMatchStats {
  player: { id: number; name: string; photo: string };
  statistics: {
    games: { minutes: number | null; number: number | null; position: string | null; rating: string | null; captain: boolean; substitute: boolean };
    goals: { total: number | null; assists: number | null; conceded?: number | null; saves?: number | null };
    shots?: { total: number | null; on: number | null };
  }[];
}

export interface Fixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    venue: { id: number | null; name: string | null; city: string | null };
    status: FixtureStatus;
  };
  league: { id: number; name: string; country: string; logo: string; season: number; round: string | null };
  teams: { home: TeamRef; away: TeamRef };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: FixtureEvent[];
  lineups?: Lineup[];
  statistics?: TeamStatistics[];
  players?: { team: TeamRef; players: PlayerMatchStats[] }[];
}

export interface StandingRow {
  rank: number;
  team: TeamRef;
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  description: string | null;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  home: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  away: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export interface StandingsResponse {
  league: { id: number; name: string; country: string; logo: string; season: number; standings: StandingRow[][] };
}

export interface PlayerSeasonStats {
  team: TeamRef;
  league: { id: number; name: string; country: string; logo: string; season: number };
  games: { appearences: number | null; lineups: number | null; minutes: number | null; number: number | null; position: string | null; rating: string | null; captain?: boolean };
  shots: { total: number | null; on: number | null };
  goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null };
  passes: { total: number | null; key: number | null; accuracy: number | null };
  tackles: { total: number | null; blocks: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number | null; yellowred: number | null; red: number | null };
  penalty: { scored: number | null; missed: number | null };
}

export interface PlayerProfile {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: { date: string | null; place: string | null; country: string | null };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured: boolean | null;
    photo: string;
  };
  statistics: PlayerSeasonStats[];
}

export interface TeamInfo {
  team: { id: number; name: string; code: string | null; country: string | null; founded: number | null; national: boolean; logo: string };
  venue: { id: number | null; name: string | null; city: string | null; capacity: number | null; surface: string | null };
}

export interface SquadResponse {
  team: TeamRef;
  players: { id: number; name: string; age: number | null; number: number | null; position: string; photo: string }[];
}

export interface TeamSeasonStats {
  form: string | null;
  fixtures: { played: { total: number }; wins: { total: number }; draws: { total: number }; loses: { total: number } };
  goals: {
    for: { total: { total: number }; average: { total: string } };
    against: { total: { total: number }; average: { total: string } };
  };
  clean_sheet: { total: number };
  failed_to_score: { total: number };
  lineups: { formation: string; played: number }[];
}

export interface TransferResponse {
  player: { id: number; name: string };
  update: string;
  transfers: { date: string; type: string | null; teams: { in: TeamRef; out: TeamRef } }[];
}
