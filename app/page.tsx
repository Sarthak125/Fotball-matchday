import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import Crest from "@/components/Crest";
import ErrorNotice from "@/components/ErrorNotice";
import MatchesView, { type MatchItem } from "@/components/MatchesView";
import MyTeams from "@/components/MyTeams";
import { getFixturesByDate, getStandings } from "@/lib/api";
import { appTimezone, isCoveredLeague, isIsoDate, LEAGUE_IDS, LEAGUES, liveRefreshSeconds, shiftIsoDate, todayIso } from "@/lib/config";
import { formatDateLabel, formatKickoff, matchState, signed, statusLabel } from "@/lib/format";
import type { Fixture } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const tz = appTimezone();
  const today = todayIso(tz);
  const date = isIsoDate(sp.date) ? sp.date : today;
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => shiftIsoDate(today, n));

  let items: MatchItem[] = [];
  let loadError: unknown = null;
  try {
    const all = await getFixturesByDate(date, date === today);
    items = all.filter((f) => isCoveredLeague(f.league.id)).map((f) => toItem(f, tz));
  } catch (err) {
    loadError = err;
  }

  let table: Awaited<ReturnType<typeof getStandings>> = null;
  let tableError: unknown = null;
  try {
    table = await getStandings(39);
  } catch (err) {
    tableError = err;
  }

  const live = items.filter((m) => m.state === "live");
  const finishedOrLive = items.filter((m) => m.state === "live" || m.state === "finished");
  const goals = finishedOrLive.reduce((s, m) => s + (m.goals.home ?? 0) + (m.goals.away ?? 0), 0);
  const top = live[0] ?? items.find((m) => m.state === "scheduled") ?? null;

  return (
    <main className="page">
      <AutoRefresh seconds={liveRefreshSeconds()} enabled={live.length > 0} />
      <div className="row">
        <aside className="col-left" aria-label="Following and competitions">
          <MyTeams />
          <section className="card">
            <div className="card-head"><h2 className="label" style={{ fontFamily: "inherit" }}>Competitions</h2></div>
            {LEAGUES.map((l) => (
              <Link key={l.id} href={`/league/${l.id}`} className="list-row">
                <span className="rating" style={{ background: "var(--muted-bg)", color: "var(--muted)", minWidth: 34 }}>{l.short}</span>
                <span className="grow" style={{ fontWeight: 600 }}>{l.name}</span>
              </Link>
            ))}
          </section>
        </aside>

        <section className="col-main" aria-label="Matches">
          <nav className="days" aria-label="Choose a day">
            {days.map((d) => {
              const lbl = formatDateLabel(d);
              return (
                <Link key={d} href={d === today ? "/" : `/?date=${d}`} className="day" aria-current={d === date ? "date" : undefined}>
                  <span>{d === today ? "Today" : lbl.dow}</span>
                  <span>{lbl.day}</span>
                </Link>
              );
            })}
          </nav>

          {loadError ? (
            <ErrorNotice error={loadError} />
          ) : (
            <>
              {top && (
                <Link href={`/match/${top.id}`} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12, color: "var(--text)", borderColor: "var(--line-strong)" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span className="label">{top.state === "live" ? "Top match" : "Up next"} · {top.league.name}</span>
                    {top.state === "live" ? <span className="live pill">{top.status}</span> : <span className="muted small">{top.kickoffText}</span>}
                  </span>
                  <span className="sb-grid">
                    <span className="team-side home" style={{ fontFamily: "var(--font-head)", fontSize: 18 }}>
                      <span>{top.home.name}</span>
                      <Crest src={top.home.logo} alt="" size="md" />
                    </span>
                    <span className="score" style={{ fontSize: 32 }}>
                      {top.state === "scheduled" ? "vs" : `${top.goals.home ?? 0} – ${top.goals.away ?? 0}`}
                    </span>
                    <span className="team-side" style={{ fontFamily: "var(--font-head)", fontSize: 18 }}>
                      <Crest src={top.away.logo} alt="" size="md" />
                      <span>{top.away.name}</span>
                    </span>
                  </span>
                </Link>
              )}
              {items.length === 0 ? (
                <div className="card empty">No Premier League, La Liga or Champions League matches on this day.</div>
              ) : (
                <MatchesView matches={items} leagueOrder={[...LEAGUE_IDS]} />
              )}
            </>
          )}
        </section>

        <aside className="col-side" aria-label="Table and insights">
          <section className="card">
            <div className="card-head">
              <h2>Premier League</h2>
              <Link href="/league/39" className="small" style={{ fontWeight: 600 }}>Full table</Link>
            </div>
            {tableError ? (
              <div style={{ padding: 16 }}><ErrorNotice error={tableError} /></div>
            ) : table ? (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th scope="col">#</th><th scope="col" className="left">Team</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr>
                  </thead>
                  <tbody>
                    {(table.league.standings[0] ?? []).slice(0, 6).map((r) => (
                      <tr key={r.team.id}>
                        <td>{r.rank}</td>
                        <td className="left"><Link href={`/team/${r.team.id}?league=39`} className="team-cell"><Crest src={r.team.logo} alt="" size="sm" />{r.team.name}</Link></td>
                        <td>{r.all.played}</td>
                        <td>{signed(r.goalsDiff)}</td>
                        <td className="strong">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">No table available yet.</p>
            )}
          </section>

          {!loadError && (
            <section className="card pad stack">
              <h2 style={{ fontSize: 16 }}>Day at a glance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Live now</span><span className="v" style={{ color: "var(--accent)" }}>{live.length}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Matches</span><span className="v">{items.length}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="muted small">Goals so far</span><span className="v">{goals}</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}>
                  <span className="muted small">Goals per match</span>
                  <span className="v">{finishedOrLive.length ? (goals / finishedOrLive.length).toFixed(2) : "–"}</span>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
