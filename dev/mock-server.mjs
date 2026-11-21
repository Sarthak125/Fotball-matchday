// Local test server that mimics the shape of API-Football v3 responses.
// For development checks only: run it, then start the app with
// API_FOOTBALL_BASE_URL=http://127.0.0.1:4010 and any API_FOOTBALL_KEY value.
// All teams and players here are fictional.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT || 4010);
const logo = (label, color) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="${color}"/><text x="20" y="25" font-size="12" text-anchor="middle" font-family="Arial" font-weight="700" fill="#0b0f14">${label}</text></svg>`)}`;

const TEAMS = {
  101: { id: 101, name: "Kingsport City", logo: logo("KGC", "#A3E635") },
  102: { id: 102, name: "Harbour Rovers", logo: logo("HAR", "#2DD4BF") },
  103: { id: 103, name: "Northbridge FC", logo: logo("NBF", "#5AB0FF") },
  104: { id: 104, name: "Millbrook Town", logo: logo("MIL", "#A78BFA") },
  105: { id: 105, name: "Riverside United", logo: logo("RIV", "#F87171") },
  106: { id: 106, name: "Ashford Athletic", logo: logo("ASH", "#FBBF24") },
  201: { id: 201, name: "Atlético Serrano", logo: logo("SER", "#F9A8D4") },
  202: { id: 202, name: "Sporting Varn", logo: logo("VRN", "#99F6E4") },
};
const LEAGUE = {
  39: { id: 39, name: "Premier League", country: "England", logo: logo("PL", "#C2CCD6") },
  140: { id: 140, name: "La Liga", country: "Spain", logo: logo("LL", "#C2CCD6") },
  2: { id: 2, name: "Champions League", country: "World", logo: logo("CL", "#C2CCD6") },
  999: { id: 999, name: "Other League", country: "Elsewhere", logo: logo("OT", "#C2CCD6") },
};
const SEASON = 2026;

function today(offsetDays = 0, hour = 15) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function fixture(id, leagueId, homeId, awayId, opts) {
  const d = opts.date;
  return {
    fixture: { id, referee: opts.referee ?? null, timezone: "UTC", date: d.toISOString(), timestamp: Math.floor(d.getTime() / 1000), venue: { id: 1, name: "Kingsport Park", city: "Kingsport" }, status: opts.status },
    league: { ...LEAGUE[leagueId], season: SEASON, round: opts.round ?? "Regular Season - 14" },
    teams: { home: { ...TEAMS[homeId], winner: null }, away: { ...TEAMS[awayId], winner: null } },
    goals: opts.goals ?? { home: null, away: null },
    score: { halftime: opts.ht ?? { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  };
}

const LIVE = { long: "Second Half", short: "2H", elapsed: 67, extra: null };
const NS = { long: "Not Started", short: "NS", elapsed: null, extra: null };
const FT = { long: "Match Finished", short: "FT", elapsed: 90, extra: null };

function dayFixtures() {
  return [
    fixture(1001, 39, 101, 102, { date: today(0, 14), status: LIVE, goals: { home: 2, away: 1 }, ht: { home: 1, away: 1 }, referee: "A. Referee" }),
    fixture(1002, 39, 105, 106, { date: today(0, 14), status: { long: "First Half", short: "1H", elapsed: 23, extra: null }, goals: { home: 0, away: 0 } }),
    fixture(1003, 39, 103, 104, { date: today(0, 17), status: NS }),
    fixture(1004, 140, 201, 202, { date: today(0, 12), status: FT, goals: { home: 2, away: 2 }, round: "Regular Season - 13" }),
    fixture(1005, 2, 101, 202, { date: today(0, 20), status: NS, round: "League Stage - 5" }),
    fixture(1006, 999, 105, 104, { date: today(0, 11), status: FT, goals: { home: 1, away: 0 } }),
  ];
}

const XI_HOME = [["Varga", 1, "G", "1:1"], ["Ruiz", 3, "D", "2:4"], ["Mensah", 5, "D", "2:3"], ["Achterberg", 4, "D", "2:2"], ["Moreau", 2, "D", "2:1"], ["Costa", 10, "M", "3:3"], ["Sato", 6, "M", "3:2"], ["Nwosu", 8, "M", "3:1"], ["Park", 11, "F", "4:3"], ["Okoro", 9, "F", "4:2"], ["Leclerc", 7, "F", "4:1"]];
const XI_AWAY = [["Holm", 1, "G", "1:1"], ["Novak", 3, "D", "2:4"], ["Adeyemi", 5, "D", "2:3"], ["Brookes", 6, "D", "2:2"], ["Lindqvist", 2, "D", "2:1"], ["Ferreira", 8, "M", "3:2"], ["Haas", 4, "M", "3:1"], ["Fischer", 11, "M", "4:3"], ["Romero", 10, "M", "4:2"], ["Tanaka", 7, "M", "4:1"], ["Kowal", 9, "F", "5:1"]];
const pid = (team, i) => team * 100 + i;

function detailed(f) {
  const h = f.teams.home, a = f.teams.away;
  const lineup = (team, xi, formation, color) => ({
    team: { ...team, colors: { player: { primary: color, number: "0b0f14", border: color } } },
    coach: { id: 1, name: `${team.name.split(" ")[0]} Coach` },
    formation,
    startXI: xi.map(([n, num, pos, grid], i) => ({ player: { id: pid(team.id, i), name: n, number: num, pos, grid } })),
    substitutes: [{ player: { id: pid(team.id, 20), name: "Bench Player", number: 21, pos: "M", grid: null } }],
  });
  const players = (team, xi) => ({
    team,
    players: xi.map(([n, num], i) => ({
      player: { id: pid(team.id, i), name: n, photo: logo(n.slice(0, 2).toUpperCase(), "#1A222C") },
      statistics: [{ games: { minutes: 67, number: num, position: "M", rating: (6.2 + ((i * 37) % 27) / 10).toFixed(1), captain: i === 0, substitute: false }, goals: { total: n === "Okoro" ? 2 : 0, assists: 0 }, shots: { total: 1, on: 1 } }],
    })),
  });
  const stat = (type, hv, av) => [{ type, value: hv }, { type, value: av }];
  const pairs = [stat("Shots on Goal", 6, 3), stat("Total Shots", 14, 9), stat("Ball Possession", "58%", "42%"), stat("Corner Kicks", 7, 4), stat("Fouls", 9, 12), stat("Yellow Cards", 1, 2), stat("Total passes", 412, 298), stat("expected_goals", "1.84", "0.92")];
  return {
    ...f,
    events: [
      { time: { elapsed: 12, extra: null }, team: h, player: { id: pid(101, 9), name: "Okoro" }, assist: { id: null, name: null }, type: "Goal", detail: "Penalty", comments: null },
      { time: { elapsed: 22, extra: null }, team: h, player: { id: pid(101, 4), name: "Moreau" }, assist: { id: null, name: null }, type: "Card", detail: "Yellow Card", comments: "Foul" },
      { time: { elapsed: 34, extra: null }, team: a, player: { id: pid(102, 10), name: "Kowal" }, assist: { id: pid(102, 9), name: "Romero" }, type: "Goal", detail: "Normal Goal", comments: null },
      { time: { elapsed: 45, extra: 2 }, team: a, player: { id: pid(102, 4), name: "Lindqvist" }, assist: { id: null, name: null }, type: "Card", detail: "Yellow Card", comments: null },
      { time: { elapsed: 58, extra: null }, team: h, player: { id: pid(101, 9), name: "Okoro" }, assist: { id: pid(101, 7), name: "Nwosu" }, type: "Goal", detail: "Normal Goal", comments: null },
      { time: { elapsed: 62, extra: null }, team: a, player: { id: pid(102, 6), name: "Haas" }, assist: { id: pid(102, 20), name: "Bench Player" }, type: "subst", detail: "Substitution 1", comments: null },
      { time: { elapsed: 64, extra: null }, team: h, player: { id: pid(101, 10), name: "Leclerc" }, assist: { id: null, name: null }, type: "Var", detail: "Goal cancelled", comments: "Offside" },
    ],
    lineups: [lineup(h, XI_HOME, "4-3-3", "A3E635"), lineup(a, XI_AWAY, "4-2-3-1", "2DD4BF")],
    statistics: [
      { team: h, statistics: pairs.map((p) => p[0]) },
      { team: a, statistics: pairs.map((p) => p[1]) },
    ],
    players: [players(h, XI_HOME), players(a, XI_AWAY)],
  };
}

function standingsFor(leagueId) {
  const ids = leagueId === 140 ? [201, 202, 105, 106] : [101, 103, 105, 102, 106, 104];
  const rows = ids.map((id, i) => {
    const win = 10 - i, draw = 2, lose = 1 + i;
    const gf = 30 - i * 3, ga = 10 + i * 2;
    const split = { played: 13, win, draw, lose, goals: { for: gf, against: ga } };
    const half = (k) => ({ played: 6 + k, win: Math.ceil(win / 2) - k, draw: 1, lose: Math.floor(lose / 2) + k, goals: { for: Math.round(gf / 2), against: Math.round(ga / 2) } });
    return { rank: i + 1, team: TEAMS[id], points: win * 3 + draw, goalsDiff: gf - ga, group: LEAGUE[leagueId].name, form: ["WWDWW", "WDWWL", "DWWLW", "WLWDW", "DDWWL", "LWLWD"][i] ?? "WDL", status: "same", description: i < 4 ? "Promotion - Champions League (League phase: )" : i === ids.length - 1 ? "Relegation - Championship" : null, all: split, home: half(0), away: half(1) };
  });
  return [{ league: { ...LEAGUE[leagueId], season: SEASON, standings: [rows] } }];
}

function profile(id) {
  const team = TEAMS[Math.floor(id / 100)] ?? TEAMS[101];
  const name = id === pid(101, 9) ? "M. Okoro" : id === pid(103, 9) ? "L. Brandt" : `Player ${id}`;
  const base = id % 7;
  const seasonStats = (league, apps, goals) => ({
    team, league: { ...LEAGUE[league], season: SEASON },
    games: { appearences: apps, lineups: apps, minutes: apps * 85, number: 9, position: "Attacker", rating: (7.1 + base / 10).toFixed(6), captain: false },
    shots: { total: goals * 3 + 5, on: goals * 2 }, goals: { total: goals, conceded: null, assists: 3 + base, saves: null },
    passes: { total: 300, key: 18 + base, accuracy: 78 }, tackles: { total: 9, blocks: 1, interceptions: 4 }, duels: { total: 120, won: 55 },
    dribbles: { attempts: 30, success: 17 }, fouls: { drawn: 20, committed: 12 }, cards: { yellow: 2, yellowred: 0, red: 0 }, penalty: { scored: 2, missed: 0 },
  });
  return {
    player: { id, name, firstname: name, lastname: name, age: 26, birth: { date: "2000-03-14", place: "Somewhere", country: "Nowhere" }, nationality: "Fictionland", height: "184 cm", weight: "78 kg", injured: false, photo: logo(name.slice(0, 2).toUpperCase(), "#1A222C") },
    statistics: [seasonStats(39, 13, 12 - base), seasonStats(2, 4, 3)],
  };
}

function route(path, q) {
  if (path === "/fixtures") {
    if (q.id) {
      const f = dayFixtures().find((x) => String(x.fixture.id) === q.id);
      return f ? [detailed(f)] : [];
    }
    if (q.date) return dayFixtures();
    if (q.team || q.league) {
      const n = Number(q.next || q.last || 5);
      return Array.from({ length: n }, (_, i) => {
        const past = Boolean(q.last);
        return fixture(2000 + i + (past ? 0 : 100), q.league ? Number(q.league) : 39, i % 2 ? 103 : 101, i % 2 ? 101 : 104, {
          date: today(past ? -(i + 2) * 3 : (i + 1) * 4, 15),
          status: past ? FT : NS,
          goals: past ? { home: (i + 2) % 3, away: i % 2 } : { home: null, away: null },
        });
      });
    }
  }
  if (path === "/fixtures/headtohead") {
    return [0, 1, 2, 3].map((i) => fixture(3000 + i, 39, i % 2 ? 102 : 101, i % 2 ? 101 : 102, { date: today(-(i + 1) * 180), status: FT, goals: { home: (i + 1) % 3, away: i % 2 } }));
  }
  if (path === "/standings") return standingsFor(Number(q.league));
  if (path === "/players/topscorers" || path === "/players/topassists") {
    return [pid(101, 9), pid(103, 9), pid(105, 9), pid(102, 10), pid(106, 9)].map(profile);
  }
  if (path === "/players") return [profile(Number(q.id))];
  if (path === "/teams") {
    const t = TEAMS[Number(q.id)];
    return t ? [{ team: { ...t, code: "KGC", country: "England", founded: 1892, national: false }, venue: { id: 1, name: "Kingsport Park", city: "Kingsport", capacity: 38500, surface: "grass" } }] : [];
  }
  if (path === "/players/squads") {
    const t = TEAMS[Number(q.team)] ?? TEAMS[101];
    const pos = ["Goalkeeper", "Defender", "Defender", "Defender", "Defender", "Midfielder", "Midfielder", "Midfielder", "Attacker", "Attacker", "Attacker", "Goalkeeper", "Defender", "Midfielder", "Attacker"];
    return [{ team: t, players: pos.map((p, i) => ({ id: pid(t.id, i), name: `${p.slice(0, 3)} Player ${i + 1}`, age: 20 + (i % 12), number: i + 1, position: p, photo: logo(String(i + 1), "#1A222C") })) }];
  }
  if (path === "/teams/statistics") {
    return { form: "WWDWWLWWDW", fixtures: { played: { total: 13 }, wins: { total: 10 }, draws: { total: 2 }, loses: { total: 1 } }, goals: { for: { total: { total: 33 }, average: { total: "2.5" } }, against: { total: { total: 12 }, average: { total: "0.9" } } }, clean_sheet: { total: 7 }, failed_to_score: { total: 1 }, lineups: [{ formation: "4-3-3", played: 11 }, { formation: "4-2-3-1", played: 2 }] };
  }
  if (path === "/transfers") {
    return [
      { player: { id: 9001, name: "R. Petit" }, update: "2026-09-02T00:00:00+00:00", transfers: [{ date: "2026-09-02", type: "€ 18M", teams: { in: TEAMS[Number(q.team)] ?? TEAMS[101], out: TEAMS[104] } }] },
      { player: { id: 9002, name: "B. Olsen" }, update: "2026-08-20T00:00:00+00:00", transfers: [{ date: "2026-08-20", type: "Loan", teams: { in: TEAMS[106], out: TEAMS[Number(q.team)] ?? TEAMS[101] } }] },
    ];
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const q = Object.fromEntries(url.searchParams);
  const send = (body) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (!req.headers["x-apisports-key"]) return send({ get: url.pathname, parameters: q, errors: { token: "Missing application key." }, results: 0, response: [] });
  if (q.simulate === "quota") return send({ errors: { requests: "You have reached the request limit for the day." }, results: 0, response: [] });
  const response = route(url.pathname, q);
  if (response === null) return send({ errors: { endpoint: `Unknown endpoint ${url.pathname}` }, results: 0, response: [] });
  send({ get: url.pathname, parameters: q, errors: [], results: Array.isArray(response) ? response.length : 1, paging: { current: 1, total: 1 }, response });
}).listen(PORT, "127.0.0.1", () => console.log(`Mock API-Football on http://127.0.0.1:${PORT}`));
