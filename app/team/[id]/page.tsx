import type { Metadata } from "next";
import Link from "next/link";
import ClientTabs from "@/components/ClientTabs";
import Crest from "@/components/Crest";
import FollowButton from "@/components/FollowButton";
import Form from "@/components/Form";
import LocalTime from "@/components/LocalTime";
import NoData from "@/components/NoData";
import { appTimezone, leagueById, seasonLabel, currentSeason } from "@/lib/config";
import { getMeta, getSquad, getStandings, hasPlayerPage, teamFixtures, teamIndex, teamInfo } from "@/lib/data";
import { formatLongDate, formatShortDate, matchState, signed, statusLabel } from "@/lib/format";
import type { Fixture } from "@/lib/types";

export const dynamicParams = false;

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;
const POSITION_LABEL: Record<string, string> = { Goalkeeper: "Goalkeepers", Defender: "Defenders", Midfielder: "Midfielders", Attacker: "Forwards" };

export function generateStaticParams() {
  const ids = [...teamIndex().keys()].map((id) => ({ id: String(id) }));
  return ids.length ? ids : [{ id: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: teamIndex().get(Number((await params).id))?.name ?? "Team" };
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
    <Link href={`/match/${m.fixture.id}/`} className="list-row">
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

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const team = teamIndex().get(id);
  if (!team) return <main className="page"><NoData what="team data" /></main>;
  const meta = getMeta();
  const tz = meta.window?.timezone ?? appTimezone();
  const season = meta.window?.season ?? currentSeason();
  const info = teamInfo(id);
  const fixtures = teamFixtures(id);
  const recent = fixtures.filter((m) => matchState(m) === "finished" || matchState(m) === "live").reverse().slice(0, 6);
  const upcoming = fixtures.filter((m) => matchState(m) === "scheduled").slice(0, 5);
  const squad = getSquad(id);

  const standings = team.leagues
    .map((l) => {
      const row = (getStandings(l)?.league.standings ?? []).flat().find((r) => r.team.id === id);
      return row ? { league: leagueById(l)!, row } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const overview = (
    <div className="row">
      <div className="col-main">
        {standings.map(({ league, row }) => {
          const a = row.all;
          return (
            <section key={league.id} className="stack" aria-label={`${league.name} ${seasonLabel(season)}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <h2><Link href={`/league/${league.id}/`} style={{ color: "var(--text)" }}>{league.name}</Link> <span className="muted" style={{ fontSize: 14 }}>{seasonLabel(season)}</span></h2>
                <Form form={row.form} />
              </div>
              <div className="tiles">
                <div className="tile"><span className="muted small">Position</span><span className="v">{row.rank}</span><span className="muted small">{row.points} pts</span></div>
                <div className="tile"><span className="muted small">Played</span><span className="v">{a.played}</span><span className="muted small">{a.win}W {a.draw}D {a.lose}L</span></div>
                <div className="tile"><span className="muted small">Goals scored</span><span className="v">{a.goals.for}</span><span className="muted small">{a.played ? (a.goals.for / a.played).toFixed(2) : "–"} per match</span></div>
                <div className="tile"><span className="muted small">Goals conceded</span><span className="v">{a.goals.against}</span><span className="muted small">{a.played ? (a.goals.against / a.played).toFixed(2) : "–"} per match</span></div>
                <div className="tile"><span className="muted small">Goal difference</span><span className="v">{signed(row.goalsDiff)}</span></div>
                <div className="tile"><span className="muted small">Home / away points</span><span className="v">{row.home.win * 3 + row.home.draw} / {row.away.win * 3 + row.away.draw}</span></div>
              </div>
            </section>
          );
        })}
        <section className="card">
          <div className="card-head"><h2>Recent results</h2></div>
          {recent.length === 0 ? <p className="empty">No results yet this season.</p> : recent.map((m) => <MatchLine key={m.fixture.id} m={m} teamId={id} tz={tz} />)}
        </section>
      </div>
      <div className="col-side">
        <section className="card">
          <div className="card-head"><h2>Upcoming</h2></div>
          {upcoming.length === 0 ? <p className="empty">No upcoming matches in these competitions.</p> : upcoming.map((m) => <MatchLine key={m.fixture.id} m={m} teamId={id} tz={tz} />)}
        </section>
        {info && (
          <section className="card pad">
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Club info</h2>
            {info.team.country && <div className="kv"><span className="muted">Country</span><span>{info.team.country}</span></div>}
            {info.team.founded && <div className="kv"><span className="muted">Founded</span><span>{info.team.founded}</span></div>}
            {info.venue.name && <div className="kv"><span className="muted">Stadium</span><span>{info.venue.name}</span></div>}
            {info.venue.capacity && <div className="kv"><span className="muted">Capacity</span><span>{info.venue.capacity.toLocaleString("en-GB")}</span></div>}
            {info.venue.city && <div className="kv"><span className="muted">City</span><span>{info.venue.city}</span></div>}
          </section>
        )}
      </div>
    </div>
  );

  const squadPanel = (
    <section className="card">
      {squad.length === 0 && <p className="empty">The squad hasn&apos;t been downloaded yet. Squads are fetched a few teams at a time, so it should appear within a few updates.</p>}
      {POSITIONS.map((pos) => {
        const list = squad.filter((p) => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
        if (!list.length) return null;
        return (
          <div key={pos} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-soft)" }}>
            <span className="label">{POSITION_LABEL[pos]}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "4px 20px", marginTop: 6 }}>
              {list.map((p) => {
                const inner = (
                  <>
                    <span className="muted" style={{ width: 24, fontWeight: 700, fontSize: 12 }}>{p.number ?? ""}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo} alt="" width={32} height={32} className="avatar" loading="lazy" referrerPolicy="no-referrer" />
                    <span className="grow" style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.age != null && <span className="muted small">{p.age} yrs</span>}
                  </>
                );
                const style = { display: "flex", alignItems: "center", gap: 10, minHeight: 44, color: "var(--text)" } as const;
                return hasPlayerPage(p.id) ? (
                  <Link key={p.id} href={`/player/${p.id}/`} style={style}>{inner}</Link>
                ) : (
                  <div key={p.id} style={style}>{inner}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );

  return (
    <main className="page">
      <section className="card page-head">
        <Crest src={team.logo} alt="" size="lg" />
        <div className="grow">
          <h1>{team.name}</h1>
          {info?.team.country && <span className="muted">{info.team.country}</span>}
        </div>
        <FollowButton team={{ id: team.id, name: team.name, logo: team.logo }} />
      </section>
      <ClientTabs
        label="Team sections"
        tabs={[{ key: "overview", label: "Overview" }, { key: "squad", label: "Squad" }]}
        panels={{ overview, squad: squadPanel }}
      />
    </main>
  );
}
