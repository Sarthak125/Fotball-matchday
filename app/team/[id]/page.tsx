import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crest from "@/components/Crest";
import ErrorNotice from "@/components/ErrorNotice";
import FollowButton from "@/components/FollowButton";
import Form from "@/components/Form";
import LocalTime from "@/components/LocalTime";
import TabLinks from "@/components/TabLinks";
import { getSquad, getTeam, getTeamFixtures, getTeamSeasonStats, getTeamTransfers } from "@/lib/api";
import { appTimezone, isCoveredLeague, leagueById, seasonLabel, currentSeason } from "@/lib/config";
import { formatLongDate, formatShortDate, matchState, statusLabel } from "@/lib/format";
import type { Fixture, TeamInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

type Tab = "overview" | "squad" | "transfers";
const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;
const POSITION_LABEL: Record<string, string> = { Goalkeeper: "Goalkeepers", Defender: "Defenders", Midfielder: "Midfielders", Attacker: "Forwards" };

function parseId(raw: string): number | null {
  return /^\d{1,10}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: "Team" };
  try {
    return { title: (await getTeam(id))?.team.name ?? "Team" };
  } catch {
    return { title: "Team" };
  }
}

function resultFor(m: Fixture, teamId: number): "W" | "D" | "L" | null {
  if (matchState(m) !== "finished" || m.goals.home == null || m.goals.away == null) return null;
  const mine = m.teams.home.id === teamId ? m.goals.home : m.goals.away;
  const theirs = m.teams.home.id === teamId ? m.goals.away : m.goals.home;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

function MatchLine({ m, teamId, tz }: { m: Fixture; teamId: number; tz: string }) {
  const home = m.teams.home.id === teamId;
  const opp = home ? m.teams.away : m.teams.home;
  const st = matchState(m);
  const r = resultFor(m, teamId);
  return (
    <Link href={`/match/${m.fixture.id}`} className="list-row">
      {r && <span className="form"><span className={r}>{r}</span></span>}
      <Crest src={opp.logo} alt="" />
      <span className="grow" style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 600 }}>{home ? "vs" : "at"} {opp.name}</span>
        <span className="muted small">
          {m.league.name}
          {st === "scheduled" && (
            <>
              {" · "}
              <LocalTime iso={m.fixture.date} serverText={formatLongDate(m.fixture.date, tz)} mode="datetime" />
            </>
          )}
        </span>
      </span>
      {st !== "scheduled" && (
        <span style={{ textAlign: "right", fontWeight: 600 }}>
          <span style={{ fontFamily: "var(--font-head)" }}>{m.goals.home} – {m.goals.away}</span>
          <br />
          <span className={st === "live" ? "live" : "muted small"}>{st === "live" ? statusLabel(m) : formatShortDate(m.fixture.date, tz)}</span>
        </span>
      )}
    </Link>
  );
}

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; league?: string }> }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const sp = await searchParams;
  const tab: Tab = sp.tab === "squad" || sp.tab === "transfers" ? sp.tab : "overview";
  const tz = appTimezone();
  const season = currentSeason();

  let info: TeamInfo | null = null;
  try {
    info = await getTeam(id);
  } catch (err) {
    return <main className="page"><ErrorNotice error={err} /></main>;
  }
  if (!info) notFound();

  const qsLeague = Number(sp.league);
  const leagueParam = isCoveredLeague(qsLeague) ? `&league=${qsLeague}` : "";
  const base = `/team/${id}`;

  let body: React.ReactNode;
  try {
    if (tab === "overview") {
      const [last, next] = await Promise.all([getTeamFixtures(id, { last: 5 }), getTeamFixtures(id, { next: 5 })]);
      const leagueId = isCoveredLeague(qsLeague) ? qsLeague : [...last, ...next].map((m) => m.league.id).find(isCoveredLeague) ?? null;
      const stats = leagueId ? await getTeamSeasonStats(id, leagueId, season).catch(() => null) : null;
      const league = leagueId ? leagueById(leagueId) : null;
      const topFormation = stats?.lineups?.slice().sort((a, b) => b.played - a.played)[0];
      body = (
        <div className="row">
          <div className="col-main">
            {stats && league && (
              <section className="stack" aria-labelledby="ss-h">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <h2 id="ss-h">{league.name} {seasonLabel(season)}</h2>
                  <Form form={stats.form} />
                </div>
                <div className="tiles">
                  <div className="tile"><span className="muted small">Played</span><span className="v">{stats.fixtures.played.total}</span><span className="muted small">{stats.fixtures.wins.total}W {stats.fixtures.draws.total}D {stats.fixtures.loses.total}L</span></div>
                  <div className="tile"><span className="muted small">Goals scored</span><span className="v">{stats.goals.for.total.total}</span><span className="muted small">{stats.goals.for.average.total} per match</span></div>
                  <div className="tile"><span className="muted small">Goals conceded</span><span className="v">{stats.goals.against.total.total}</span><span className="muted small">{stats.goals.against.average.total} per match</span></div>
                  <div className="tile"><span className="muted small">Clean sheets</span><span className="v">{stats.clean_sheet.total}</span></div>
                  <div className="tile"><span className="muted small">Failed to score</span><span className="v">{stats.failed_to_score.total}</span></div>
                  {topFormation && <div className="tile"><span className="muted small">Main formation</span><span className="v">{topFormation.formation}</span><span className="muted small">{topFormation.played} matches</span></div>}
                </div>
              </section>
            )}
            <section className="card">
              <div className="card-head"><h2>Recent results</h2></div>
              {last.length === 0 ? <p className="empty">No recent matches.</p> : [...last].sort((a, b) => b.fixture.timestamp - a.fixture.timestamp).map((m) => <MatchLine key={m.fixture.id} m={m} teamId={id} tz={tz} />)}
            </section>
          </div>
          <div className="col-side">
            <section className="card">
              <div className="card-head"><h2>Upcoming</h2></div>
              {next.length === 0 ? <p className="empty">No upcoming matches scheduled.</p> : next.map((m) => <MatchLine key={m.fixture.id} m={m} teamId={id} tz={tz} />)}
            </section>
            <section className="card pad">
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Club info</h2>
              {info.team.country && <div className="kv"><span className="muted">Country</span><span>{info.team.country}</span></div>}
              {info.team.founded && <div className="kv"><span className="muted">Founded</span><span>{info.team.founded}</span></div>}
              {info.venue.name && <div className="kv"><span className="muted">Stadium</span><span>{info.venue.name}</span></div>}
              {info.venue.capacity && <div className="kv"><span className="muted">Capacity</span><span>{info.venue.capacity.toLocaleString("en-GB")}</span></div>}
              {info.venue.city && <div className="kv"><span className="muted">City</span><span>{info.venue.city}</span></div>}
            </section>
          </div>
        </div>
      );
    } else if (tab === "squad") {
      const squad = await getSquad(id);
      const players = squad?.players ?? [];
      body = (
        <section className="card">
          {players.length === 0 && <p className="empty">Squad not available.</p>}
          {POSITIONS.map((pos) => {
            const list = players.filter((p) => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
            if (!list.length) return null;
            return (
              <div key={pos} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-soft)" }}>
                <span className="label">{POSITION_LABEL[pos]}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "4px 20px", marginTop: 6 }}>
                  {list.map((p) => (
                    <Link key={p.id} href={`/player/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, color: "var(--text)" }}>
                      <span className="muted" style={{ width: 24, fontWeight: 700, fontSize: 12 }}>{p.number ?? ""}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo} alt="" width={32} height={32} className="avatar" loading="lazy" referrerPolicy="no-referrer" />
                      <span className="grow" style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.age != null && <span className="muted small">{p.age} yrs</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      );
    } else {
      const transfers = await getTeamTransfers(id);
      const moves = transfers
        .flatMap((t) => t.transfers.filter((x) => x.teams.in.id === id || x.teams.out.id === id).map((x) => ({ player: t.player, ...x })))
        .filter((x) => !Number.isNaN(Date.parse(x.date)))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 30);
      body = (
        <section className="card">
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 640 }}>
              <thead><tr><th scope="col" className="left">Date</th><th scope="col" className="left">Player</th><th scope="col" className="left">Move</th><th scope="col" className="left">Type</th></tr></thead>
              <tbody>
                {moves.map((m, i) => {
                  const incoming = m.teams.in.id === id;
                  const other = incoming ? m.teams.out : m.teams.in;
                  return (
                    <tr key={`${m.player.id}-${m.date}-${i}`}>
                      <td className="left">{formatShortDate(m.date, "UTC")}</td>
                      <td className="left"><Link href={`/player/${m.player.id}`} className="team-cell">{m.player.name}</Link></td>
                      <td className="left"><span style={{ color: incoming ? "var(--accent)" : "var(--loss)", fontWeight: 700 }}>{incoming ? "In" : "Out"}</span> {incoming ? "from" : "to"} {other.name}</td>
                      <td className="left">{m.type ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {moves.length === 0 && <p className="empty">No transfers recorded.</p>}
        </section>
      );
    }
  } catch (err) {
    body = <ErrorNotice error={err} />;
  }

  return (
    <main className="page">
      <section className="card page-head">
        <Crest src={info.team.logo} alt="" size="lg" />
        <div className="grow">
          <h1>{info.team.name}</h1>
          {info.team.country && <span className="muted">{info.team.country}</span>}
        </div>
        <FollowButton team={{ id: info.team.id, name: info.team.name, logo: info.team.logo }} />
      </section>
      <TabLinks
        label="Team sections"
        active={tab}
        tabs={[
          { key: "overview", label: "Overview", href: `${base}${leagueParam ? `?${leagueParam.slice(1)}` : ""}` },
          { key: "squad", label: "Squad", href: `${base}?tab=squad${leagueParam}` },
          { key: "transfers", label: "Transfers", href: `${base}?tab=transfers${leagueParam}` },
        ]}
      />
      {body}
    </main>
  );
}
