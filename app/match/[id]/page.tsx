import type { Metadata } from "next";
import Link from "next/link";
import ClientTabs from "@/components/ClientTabs";
import Crest from "@/components/Crest";
import LocalTime from "@/components/LocalTime";
import NoData from "@/components/NoData";
import Pitch from "@/components/Pitch";
import Rating from "@/components/Rating";
import StatBar from "@/components/StatBar";
import { appTimezone } from "@/lib/config";
import { allFixtures, getFixture, getMeta, getStandings, hasPlayerPage, hasTeamPage } from "@/lib/data";
import { eventMinute, eventTag, formatLongDate, formatShortDate, matchState, parseRating, signed, statusLabel } from "@/lib/format";
import type { Fixture, TeamRef } from "@/lib/types";

export const dynamicParams = false;

const TOP_STATS = ["expected_goals", "Ball Possession", "Total Shots", "Shots on Goal", "Corner Kicks", "Fouls"];
const STAT_LABELS: Record<string, string> = { expected_goals: "Expected goals (xG)", goals_prevented: "Goals prevented" };

export function generateStaticParams() {
  const ids = allFixtures().map((f) => ({ id: String(f.fixture.id) }));
  // A static export needs at least one page per route.
  return ids.length ? ids : [{ id: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const f = getFixture(Number((await params).id));
  return { title: f ? `${f.teams.home.name} vs ${f.teams.away.name}` : "Match" };
}

function statPairs(f: Fixture) {
  const [h, a] = f.statistics ?? [];
  if (!h || !a) return [];
  return h.statistics.map((s) => ({
    type: s.type,
    label: STAT_LABELS[s.type] ?? s.type,
    home: s.value,
    away: a.statistics.find((x) => x.type === s.type)?.value ?? null,
  }));
}

function ratingsMap(f: Fixture) {
  const m = new Map<number, number>();
  for (const t of f.players ?? []) {
    for (const p of t.players) {
      const r = parseRating(p.statistics[0]?.games.rating);
      if (r != null) m.set(p.player.id, r);
    }
  }
  return m;
}

function TeamLink({ team, className, children }: { team: TeamRef; className: string; children: React.ReactNode }) {
  return hasTeamPage(team.id) ? (
    <Link href={`/team/${team.id}/`} className={className}>{children}</Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function PlayerName({ id, name }: { id: number | null; name: string | null }) {
  if (!name) return null;
  return hasPlayerPage(id) ? <Link href={`/player/${id}/`}>{name}</Link> : <>{name}</>;
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const f = getFixture(id);
  const tz = getMeta().window?.timezone ?? appTimezone();
  if (!f) return <main className="page"><NoData what="match data" /></main>;

  const state = matchState(f);
  const label = statusLabel(f);
  const home = f.teams.home;
  const away = f.teams.away;
  const pairs = statPairs(f);
  const xg = pairs.find((p) => p.type === "expected_goals");
  const ratings = ratingsMap(f);
  const hasDetails = Array.isArray(f.events) || Array.isArray(f.lineups);
  const events = [...(f.events ?? [])].sort((a, b) => b.time.elapsed - a.time.elapsed || (b.time.extra ?? 0) - (a.time.extra ?? 0));
  const goalsFor = (teamId: number) =>
    (f.events ?? [])
      .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty" && e.team.id === teamId)
      .map((e) => `${e.player.name ?? "Unknown"} ${eventMinute(e)}${e.detail === "Penalty" ? " (pen)" : e.detail === "Own Goal" ? " (og)" : ""}`);

  const allPlayers = (f.players ?? []).flatMap((t) => t.players.map((p) => ({ ...p, team: t.team })));
  const topRated = allPlayers
    .map((p) => ({ p, r: parseRating(p.statistics[0]?.games.rating) }))
    .filter((x): x is { p: (typeof allPlayers)[number]; r: number } => x.r != null)
    .sort((a, b) => b.r - a.r)[0];

  const homeLineup = f.lineups?.find((l) => l.team.id === home.id);
  const awayLineup = f.lineups?.find((l) => l.team.id === away.id);

  const h2h = allFixtures()
    .filter((m) => m.fixture.id !== f.fixture.id && [m.teams.home.id, m.teams.away.id].includes(home.id) && [m.teams.home.id, m.teams.away.id].includes(away.id))
    .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp);
  const h2hSummary = h2h.reduce(
    (acc, m) => {
      if (m.goals.home == null || m.goals.away == null || matchState(m) !== "finished") return acc;
      const hg = m.teams.home.id === home.id ? m.goals.home : m.goals.away;
      const ag = m.teams.home.id === home.id ? m.goals.away : m.goals.home;
      if (hg > ag) acc.home++;
      else if (hg < ag) acc.away++;
      else acc.draw++;
      return acc;
    },
    { home: 0, draw: 0, away: 0 },
  );

  const table = getStandings(f.league.id);
  const tableGroup = table?.league.standings.find((g) => g.some((r) => r.team.id === home.id || r.team.id === away.id)) ?? table?.league.standings[0] ?? [];

  const legend = (
    <span className="legend"><span><i style={{ background: "var(--accent)" }} />{home.name}</span><span><i style={{ background: "var(--away)" }} />{away.name}</span></span>
  );

  const facts = (
    <div className="row">
      <div className="col-main">
        {pairs.length > 0 && (
          <section className="card pad stack" aria-labelledby="ts-h">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <h2 id="ts-h">Top stats</h2>
              {legend}
            </div>
            {TOP_STATS.map((type) => pairs.find((p) => p.type === type)).filter(Boolean).map((p) => (
              <StatBar key={p!.type} label={p!.label} home={p!.home} away={p!.away} />
            ))}
          </section>
        )}
        <section className="card" aria-labelledby="ev-h">
          <div className="card-head"><h2 id="ev-h">Events</h2></div>
          {events.length === 0 ? (
            <p className="empty">
              {state === "scheduled" ? "The match hasn't started yet." : hasDetails ? "No events reported." : "Match details are only kept for recent matches."}
            </p>
          ) : (
            <ol className="events">
              {events.map((e, i) => {
                const t = eventTag(e);
                const teamName = e.team.id === home.id ? home.name : away.name;
                return (
                  <li key={i}>
                    <span className="muted" style={{ fontWeight: 700, fontSize: 13 }}>{eventMinute(e)}</span>
                    <span className={`etag ${t.tone}`}>{t.tag}</span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{e.detail}, {teamName}</span>
                      <span className="muted small">
                        {e.type === "subst" ? (
                          <><PlayerName id={e.assist.id} name={e.assist.name} /> on for <PlayerName id={e.player.id} name={e.player.name} /></>
                        ) : (
                          <>
                            <PlayerName id={e.player.id} name={e.player.name} />
                            {e.type === "Goal" && e.assist.name && <>, assist by <PlayerName id={e.assist.id} name={e.assist.name} /></>}
                          </>
                        )}
                        {e.comments ? ` · ${e.comments}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
      <div className="col-side">
        {topRated && (
          <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={topRated.p.player.photo} alt="" width={56} height={56} className="avatar" loading="lazy" referrerPolicy="no-referrer" />
            <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="label">{state === "finished" ? "Player of the match" : "Top rated so far"}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}><PlayerName id={topRated.p.player.id} name={topRated.p.player.name} /></span>
              <span className="muted small">{topRated.p.team.name}</span>
            </span>
            <Rating value={topRated.r} />
          </div>
        )}
        <section className="card pad" aria-labelledby="mi-h">
          <h2 id="mi-h" style={{ fontSize: 16, marginBottom: 8 }}>Match info</h2>
          <div className="kv"><span className="muted">Kick-off</span><span><LocalTime iso={f.fixture.date} serverText={formatLongDate(f.fixture.date, tz)} mode="datetime" /></span></div>
          {f.fixture.venue.name && <div className="kv"><span className="muted">Venue</span><span>{f.fixture.venue.name}{f.fixture.venue.city ? `, ${f.fixture.venue.city}` : ""}</span></div>}
          {f.fixture.referee && <div className="kv"><span className="muted">Referee</span><span>{f.fixture.referee}</span></div>}
          {f.score.halftime.home != null && <div className="kv"><span className="muted">Half-time</span><span>{f.score.halftime.home} – {f.score.halftime.away}</span></div>}
          {f.score.penalty.home != null && <div className="kv"><span className="muted">Penalties</span><span>{f.score.penalty.home} – {f.score.penalty.away}</span></div>}
        </section>
      </div>
    </div>
  );

  const lineup = (
    <section className="card pad stack" aria-label="Lineups">
      {homeLineup && awayLineup ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700, flexWrap: "wrap" }}>
            <span>{home.name}{homeLineup.formation ? ` · ${homeLineup.formation}` : ""}</span>
            <span>{awayLineup.formation ? `${awayLineup.formation} · ` : ""}{away.name}</span>
          </div>
          <Pitch home={homeLineup} away={awayLineup} ratings={ratings} />
          <div className="row">
            {[homeLineup, awayLineup].map((l) => (
              <div key={l.team.id} style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="label">{l.team.name}{l.coach.name ? ` · Coach ${l.coach.name}` : ""}</span>
                {[...l.startXI.map((p) => ({ ...p, starter: true })), ...l.substitutes.map((p) => ({ ...p, starter: false }))].map((p) => (
                  <div key={p.player.id} className="kv">
                    <span style={{ display: "flex", gap: 10 }}>
                      <span className="muted" style={{ width: 24, fontWeight: 700 }}>{p.player.number ?? ""}</span>
                      <span><PlayerName id={p.player.id} name={p.player.name} /></span>
                      {!p.starter && <span className="muted small">Bench</span>}
                    </span>
                    <span><Rating value={ratings.get(p.player.id) ?? null} /></span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="empty">{state === "scheduled" ? "Lineups are usually published about an hour before kick-off." : "No lineups available for this match."}</p>
      )}
    </section>
  );

  const stats = (
    <section className="card pad stack" aria-label="Match stats">
      {pairs.length ? (
        <>
          {legend}
          {pairs.map((p) => <StatBar key={p.type} label={p.label} home={p.home} away={p.away} />)}
        </>
      ) : (
        <p className="empty">{state === "scheduled" ? "Stats appear once the match is under way." : "No stats available for this match."}</p>
      )}
    </section>
  );

  const headToHead = (
    <section className="card pad stack" aria-label="Head-to-head">
      <p className="muted small" style={{ margin: 0 }}>Meetings this season in the Premier League, La Liga and Champions League.</p>
      {h2h.length === 0 ? (
        <p className="empty">No other meetings this season.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, textAlign: "center" }}>
            <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v" style={{ color: "var(--accent)" }}>{h2hSummary.home}</span><span className="muted small">{home.name} wins</span></div>
            <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v">{h2hSummary.draw}</span><span className="muted small">Draws</span></div>
            <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v" style={{ color: "var(--away)" }}>{h2hSummary.away}</span><span className="muted small">{away.name} wins</span></div>
          </div>
          {h2h.map((m) => (
            <Link key={m.fixture.id} href={`/match/${m.fixture.id}/`} className="kv" style={{ color: "var(--text)", alignItems: "center" }}>
              <span className="muted small" style={{ width: 120, flexShrink: 0 }}>{formatShortDate(m.fixture.date, tz)}<br />{m.league.name}</span>
              <span style={{ flex: 1, textAlign: "right" }}>{m.teams.home.name}</span>
              <span style={{ width: 70, textAlign: "center", fontFamily: "var(--font-head)", fontWeight: 700 }}>{matchState(m) === "scheduled" ? "vs" : `${m.goals.home ?? "–"} – ${m.goals.away ?? "–"}`}</span>
              <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>{m.teams.away.name}</span>
            </Link>
          ))}
        </>
      )}
    </section>
  );

  const tablePanel = (
    <section className="card" aria-label="Table">
      {tableGroup.length === 0 ? (
        <p className="empty">No table for this competition yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th scope="col">#</th><th scope="col" className="left">Team</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
            <tbody>
              {tableGroup.map((r) => (
                <tr key={r.team.id} className={r.team.id === home.id || r.team.id === away.id ? "hl" : undefined}>
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
      )}
    </section>
  );

  return (
    <main className="page" style={{ maxWidth: 1360 }}>
      <Link href="/" className="small" style={{ fontWeight: 600, color: "var(--text-2)" }}>‹ All matches</Link>

      <section className="card scoreboard" aria-label="Scoreboard">
        <Link href={`/league/${f.league.id}/`} className="muted small">{f.league.name}{f.league.round ? ` · ${f.league.round}` : ""}</Link>
        <div className="sb-grid">
          <TeamLink team={home} className="sb-team">
            <Crest src={home.logo} alt="" size="lg" />
            <span className="name">{home.name}</span>
            <span className="muted small">{goalsFor(home.id).join(", ")}</span>
          </TeamLink>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span className="sb-score">{state === "scheduled" ? "vs" : `${f.goals.home ?? 0} – ${f.goals.away ?? 0}`}</span>
            {state === "live" && <span className="live pill">{label} at last update</span>}
            {(state === "finished" || state === "off") && <span className="muted small" style={{ fontWeight: 700 }}>{f.fixture.status.long}</span>}
            {state === "scheduled" && <span className="muted small"><LocalTime iso={f.fixture.date} serverText={formatLongDate(f.fixture.date, tz)} mode="datetime" /></span>}
            {xg && <span className="muted small">xG {xg.home ?? "0"} – {xg.away ?? "0"}</span>}
          </div>
          <TeamLink team={away} className="sb-team">
            <Crest src={away.logo} alt="" size="lg" />
            <span className="name">{away.name}</span>
            <span className="muted small">{goalsFor(away.id).join(", ")}</span>
          </TeamLink>
        </div>
      </section>

      <ClientTabs
        label="Match sections"
        tabs={[
          { key: "facts", label: "Facts" },
          { key: "lineup", label: "Lineup" },
          { key: "stats", label: "Stats" },
          { key: "h2h", label: "Head-to-head" },
          { key: "table", label: "Table" },
        ]}
        panels={{ facts, lineup, stats, h2h: headToHead, table: tablePanel }}
      />
    </main>
  );
}
