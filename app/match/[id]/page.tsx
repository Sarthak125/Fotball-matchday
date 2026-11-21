import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import Crest from "@/components/Crest";
import ErrorNotice from "@/components/ErrorNotice";
import LocalTime from "@/components/LocalTime";
import Pitch from "@/components/Pitch";
import Rating from "@/components/Rating";
import StatBar from "@/components/StatBar";
import TabLinks from "@/components/TabLinks";
import { getFixture, getHeadToHead, getStandings } from "@/lib/api";
import { appTimezone, liveRefreshSeconds } from "@/lib/config";
import { eventMinute, eventTag, formatLongDate, formatShortDate, matchState, parseRating, signed, statusLabel } from "@/lib/format";
import type { Fixture } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "facts", label: "Facts" },
  { key: "lineup", label: "Lineup" },
  { key: "stats", label: "Stats" },
  { key: "h2h", label: "Head-to-head" },
  { key: "table", label: "Table" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const TOP_STATS = ["expected_goals", "Ball Possession", "Total Shots", "Shots on Goal", "Corner Kicks", "Fouls"];
const STAT_LABELS: Record<string, string> = { expected_goals: "Expected goals (xG)", goals_prevented: "Goals prevented" };

function parseId(raw: string): number | null {
  return /^\d{1,10}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: "Match" };
  try {
    const f = await getFixture(id);
    return { title: f ? `${f.teams.home.name} vs ${f.teams.away.name}` : "Match" };
  } catch {
    return { title: "Match" };
  }
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

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const sp = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "facts";
  const tz = appTimezone();

  let f: Fixture | null = null;
  try {
    f = await getFixture(id);
  } catch (err) {
    return <main className="page"><ErrorNotice error={err} /></main>;
  }
  if (!f) notFound();

  const state = matchState(f);
  const label = statusLabel(f);
  const home = f.teams.home;
  const away = f.teams.away;
  const pairs = statPairs(f);
  const xg = pairs.find((p) => p.type === "expected_goals");
  const ratings = ratingsMap(f);
  const events = [...(f.events ?? [])].sort((a, b) => b.time.elapsed - a.time.elapsed || (b.time.extra ?? 0) - (a.time.extra ?? 0));
  const goalsFor = (teamId: number) =>
    (f!.events ?? [])
      .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty" && e.team.id === teamId)
      .map((e) => `${e.player.name ?? "Unknown"} ${eventMinute(e)}${e.detail === "Penalty" ? " (pen)" : e.detail === "Own Goal" ? " (og)" : ""}`);

  const allPlayers = (f.players ?? []).flatMap((t) => t.players.map((p) => ({ ...p, team: t.team })));
  const topRated = allPlayers
    .map((p) => ({ p, r: parseRating(p.statistics[0]?.games.rating) }))
    .filter((x): x is { p: (typeof allPlayers)[number]; r: number } => x.r != null)
    .sort((a, b) => b.r - a.r)[0];

  const lineups = f.lineups ?? [];
  const homeLineup = lineups.find((l) => l.team.id === home.id);
  const awayLineup = lineups.find((l) => l.team.id === away.id);

  let h2h: Fixture[] = [];
  let h2hError: unknown = null;
  if (tab === "h2h") {
    try {
      h2h = (await getHeadToHead(home.id, away.id)).filter((m) => m.fixture.id !== f!.fixture.id).sort((a, b) => b.fixture.timestamp - a.fixture.timestamp);
    } catch (err) {
      h2hError = err;
    }
  }

  let table: Awaited<ReturnType<typeof getStandings>> = null;
  let tableError: unknown = null;
  if (tab === "table") {
    try {
      table = await getStandings(f.league.id, f.league.season);
    } catch (err) {
      tableError = err;
    }
  }
  const tableGroup = table?.league.standings.find((g) => g.some((r) => r.team.id === home.id || r.team.id === away.id)) ?? table?.league.standings[0] ?? [];

  const h2hSummary = h2h.reduce(
    (acc, m) => {
      if (m.goals.home == null || m.goals.away == null || matchState(m) !== "finished") return acc;
      const homeGoals = m.teams.home.id === home.id ? m.goals.home : m.goals.away;
      const awayGoals = m.teams.home.id === home.id ? m.goals.away : m.goals.home;
      if (homeGoals > awayGoals) acc.home++;
      else if (homeGoals < awayGoals) acc.away++;
      else acc.draw++;
      return acc;
    },
    { home: 0, draw: 0, away: 0 },
  );

  return (
    <main className="page" style={{ maxWidth: 1360 }}>
      <AutoRefresh seconds={liveRefreshSeconds()} enabled={state === "live"} />
      <Link href="/" className="small" style={{ fontWeight: 600, color: "var(--text-2)" }}>‹ All matches</Link>

      <section className="card scoreboard" aria-label="Scoreboard">
        <Link href={`/league/${f.league.id}`} className="muted small">{f.league.name}{f.league.round ? ` · ${f.league.round}` : ""}</Link>
        <div className="sb-grid">
          <Link href={`/team/${home.id}?league=${f.league.id}`} className="sb-team">
            <Crest src={home.logo} alt="" size="lg" />
            <span className="name">{home.name}</span>
            <span className="muted small">{goalsFor(home.id).join(", ")}</span>
          </Link>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span className="sb-score">{state === "scheduled" ? "vs" : `${f.goals.home ?? 0} – ${f.goals.away ?? 0}`}</span>
            {state === "live" && <span className="live pill">{label}</span>}
            {state === "finished" && <span className="muted small" style={{ fontWeight: 700 }}>{f.fixture.status.long}</span>}
            {state === "off" && <span className="muted small" style={{ fontWeight: 700 }}>{f.fixture.status.long}</span>}
            {state === "scheduled" && <span className="muted small"><LocalTime iso={f.fixture.date} serverText={formatLongDate(f.fixture.date, tz)} mode="datetime" /></span>}
            {xg && <span className="muted small">xG {xg.home ?? "0"} – {xg.away ?? "0"}</span>}
          </div>
          <Link href={`/team/${away.id}?league=${f.league.id}`} className="sb-team">
            <Crest src={away.logo} alt="" size="lg" />
            <span className="name">{away.name}</span>
            <span className="muted small">{goalsFor(away.id).join(", ")}</span>
          </Link>
        </div>
      </section>

      <TabLinks label="Match sections" active={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: t.key === "facts" ? `/match/${id}` : `/match/${id}?tab=${t.key}` }))} />

      {tab === "facts" && (
        <div className="row">
          <div className="col-main">
            {pairs.length > 0 && (
              <section className="card pad stack" aria-labelledby="ts-h">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <h2 id="ts-h">Top stats</h2>
                  <span className="legend"><span><i style={{ background: "var(--accent)" }} />{home.name}</span><span><i style={{ background: "var(--away)" }} />{away.name}</span></span>
                </div>
                {TOP_STATS.map((type) => pairs.find((p) => p.type === type)).filter(Boolean).map((p) => (
                  <StatBar key={p!.type} label={p!.label} home={p!.home} away={p!.away} />
                ))}
              </section>
            )}
            <section className="card" aria-labelledby="ev-h">
              <div className="card-head"><h2 id="ev-h">Events</h2></div>
              {events.length === 0 ? (
                <p className="empty">{state === "scheduled" ? "The match hasn't started yet." : "No events reported yet."}</p>
              ) : (
                <ol className="events">
                  {events.map((e, i) => {
                    const t = eventTag(e);
                    const teamName = e.team.id === home.id ? home.name : away.name;
                    const detail =
                      e.type === "subst"
                        ? `${e.assist.name ?? ""} on for ${e.player.name ?? ""}`
                        : e.type === "Goal" && e.assist.name
                          ? `${e.player.name}, assist by ${e.assist.name}`
                          : e.player.name ?? "";
                    return (
                      <li key={i}>
                        <span className="muted" style={{ fontWeight: 700, fontSize: 13 }}>{eventMinute(e)}</span>
                        <span className={`etag ${t.tone}`}>{t.tag}</span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 600 }}>{e.detail}, {teamName}</span>
                          <span className="muted small">{detail}{e.comments ? ` · ${e.comments}` : ""}</span>
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
              <Link href={`/player/${topRated.p.player.id}`} className="card pad" style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--text)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={topRated.p.player.photo} alt="" width={56} height={56} className="avatar" loading="lazy" referrerPolicy="no-referrer" />
                <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="label">{state === "finished" ? "Player of the match" : "Top rated so far"}</span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{topRated.p.player.name}</span>
                  <span className="muted small">{topRated.p.team.name}</span>
                </span>
                <Rating value={topRated.r} />
              </Link>
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
      )}

      {tab === "lineup" && (
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
                      <Link key={p.player.id} href={`/player/${p.player.id}`} className="kv" style={{ color: "var(--text)" }}>
                        <span style={{ display: "flex", gap: 10 }}>
                          <span className="muted" style={{ width: 24, fontWeight: 700 }}>{p.player.number ?? ""}</span>
                          <span>{p.player.name}</span>
                          {!p.starter && <span className="muted small">Bench</span>}
                        </span>
                        <span><Rating value={ratings.get(p.player.id) ?? null} /></span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">Lineups are usually published about an hour before kick-off.</p>
          )}
        </section>
      )}

      {tab === "stats" && (
        <section className="card pad stack" aria-label="Match stats">
          {pairs.length ? (
            <>
              <span className="legend"><span><i style={{ background: "var(--accent)" }} />{home.name}</span><span><i style={{ background: "var(--away)" }} />{away.name}</span></span>
              {pairs.map((p) => <StatBar key={p.type} label={p.label} home={p.home} away={p.away} />)}
            </>
          ) : (
            <p className="empty">Stats appear once the match is under way.</p>
          )}
        </section>
      )}

      {tab === "h2h" && (
        <section className="card pad stack" aria-label="Head-to-head">
          {h2hError ? (
            <ErrorNotice error={h2hError} />
          ) : h2h.length === 0 ? (
            <p className="empty">No previous meetings found.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, textAlign: "center" }}>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v" style={{ color: "var(--accent)" }}>{h2hSummary.home}</span><span className="muted small">{home.name} wins</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v">{h2hSummary.draw}</span><span className="muted small">Draws</span></div>
                <div className="tile" style={{ background: "var(--bg-2)" }}><span className="v" style={{ color: "var(--away)" }}>{h2hSummary.away}</span><span className="muted small">{away.name} wins</span></div>
              </div>
              {h2h.map((m) => (
                <Link key={m.fixture.id} href={`/match/${m.fixture.id}`} className="kv" style={{ color: "var(--text)", alignItems: "center" }}>
                  <span className="muted small" style={{ width: 120, flexShrink: 0 }}>{formatShortDate(m.fixture.date, tz)}<br />{m.league.name}</span>
                  <span style={{ flex: 1, textAlign: "right" }}>{m.teams.home.name}</span>
                  <span style={{ width: 70, textAlign: "center", fontFamily: "var(--font-head)", fontWeight: 700 }}>{m.goals.home ?? "–"} – {m.goals.away ?? "–"}</span>
                  <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>{m.teams.away.name}</span>
                </Link>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "table" && (
        <section className="card" aria-label="Table">
          {tableError ? (
            <div style={{ padding: 16 }}><ErrorNotice error={tableError} /></div>
          ) : tableGroup.length === 0 ? (
            <p className="empty">No table for this competition.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th scope="col">#</th><th scope="col" className="left">Team</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
                <tbody>
                  {tableGroup.map((r) => (
                    <tr key={r.team.id} className={r.team.id === home.id || r.team.id === away.id ? "hl" : undefined}>
                      <td>{r.rank}</td>
                      <td className="left"><Link href={`/team/${r.team.id}?league=${f!.league.id}`} className="team-cell"><Crest src={r.team.logo} alt="" size="sm" />{r.team.name}</Link></td>
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
      )}
    </main>
  );
}
