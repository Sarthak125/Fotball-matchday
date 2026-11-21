import Link from "next/link";
import Crest from "@/components/Crest";
import MatchesView, { type MatchDay, type MatchItem } from "@/components/MatchesView";
import MyTeams from "@/components/MyTeams";
import NoData from "@/components/NoData";
import { LEAGUE_IDS, LEAGUES, appTimezone, shiftIsoDate, todayIso } from "@/lib/config";
import { getMeta, getStandings, getWindowFixtures } from "@/lib/data";
import { formatDateLabel, formatKickoff, matchState, signed, statusLabel } from "@/lib/format";
import type { Fixture } from "@/lib/types";

function toItem(f: Fixture, tz: string): MatchItem {
  return {
    id: f.fixture.id,
    league: { id: f.league.id, name: f.league.name, logo: f.league.logo, round: f.league.round },
    state: matchState(f),
    status: statusLabel(f),
    kickoffIso: f.fixture.date,
    kickoffText: formatKickoff(f.fixture.date, tz),
    timestamp: f.fixture.timestamp,
    home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
    away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
    goals: f.goals,
  };
}

/** Calendar date of a kick-off in the given time zone. */
function localDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default function MatchesPage() {
  const meta = getMeta();
  const tz = meta.window?.timezone ?? appTimezone();
  const today = meta.window?.today ?? todayIso(tz);
  const fixtures = LEAGUE_IDS.flatMap((l) => getWindowFixtures(l));

  const days: MatchDay[] = [-3, -2, -1, 0, 1, 2, 3].map((n) => {
    const date = shiftIsoDate(today, n);
    const lbl = formatDateLabel(date);
    return {
      date,
      dow: lbl.dow,
      label: lbl.day,
      items: fixtures.filter((f) => localDate(f.fixture.date, tz) === date).map((f) => toItem(f, tz)),
    };
  });

  const table = getStandings(39);
  const todays = days.find((d) => d.date === today)?.items ?? [];
  const live = todays.filter((m) => m.state === "live");
  const played = todays.filter((m) => m.state === "live" || m.state === "finished");
  const goals = played.reduce((s, m) => s + (m.goals.home ?? 0) + (m.goals.away ?? 0), 0);

  return (
    <main className="page">
      <div className="row">
        <aside className="col-left" aria-label="Following and competitions">
          <MyTeams />
          <section className="card">
            <div className="card-head"><h2 className="label" style={{ fontFamily: "inherit" }}>Competitions</h2></div>
            {LEAGUES.map((l) => (
              <Link key={l.id} href={`/league/${l.id}/`} className="list-row">
                <span className="rating" style={{ background: "var(--muted-bg)", color: "var(--muted)", minWidth: 34 }}>{l.short}</span>
                <span className="grow" style={{ fontWeight: 600 }}>{l.name}</span>
              </Link>
            ))}
          </section>
        </aside>

        <section className="col-main" aria-label="Matches">
          {!meta.lastRun ? <NoData /> : <MatchesView days={days} defaultDate={today} leagueOrder={[...LEAGUE_IDS]} />}
        </section>

        <aside className="col-side" aria-label="Table and insights">
          <section className="card">
            <div className="card-head">
              <h2>Premier League</h2>
              <Link href="/league/39/" className="small" style={{ fontWeight: 600 }}>Full table</Link>
            </div>
            {table ? (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th scope="col">#</th><th scope="col" className="left">Team</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr>
                  </thead>
                  <tbody>
                    {(table.league.standings[0] ?? []).slice(0, 6).map((r) => (
                      <tr key={r.team.id}>
                        <td>{r.rank}</td>
                        <td className="left"><Link href={`/team/${r.team.id}/`} className="team-cell"><Crest src={r.team.logo} alt="" size="sm" />{r.team.name}</Link></td>
                        <td>{r.all.played}</td>
                        <td>{signed(r.goalsDiff)}</td>
                        <td className="strong">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">No table yet.</p>
            )}
          </section>

          {meta.lastRun && (
            <section className="card pad stack">
              <h2 style={{ fontSize: 16 }}>Today at a glance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Live at last update</span><span className="v" style={{ color: "var(--accent)" }}>{live.length}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Matches</span><span className="v">{todays.length}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Goals so far</span><span className="v">{goals}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}>
                  <span className="muted small">Goals per match</span>
                  <span className="v">{played.length ? (goals / played.length).toFixed(2) : "–"}</span>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
