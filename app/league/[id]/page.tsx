import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientTabs from "@/components/ClientTabs";
import Crest from "@/components/Crest";
import Form from "@/components/Form";
import LocalTime from "@/components/LocalTime";
import { appTimezone, currentSeason, LEAGUES, leagueById, seasonLabel } from "@/lib/config";
import { getMeta, getSeasonFixtures, getStandings, getTopAssists, getTopScorers } from "@/lib/data";
import { formatLongDate, matchState, signed, statusLabel } from "@/lib/format";
import type { Fixture, PlayerProfile, StandingRow } from "@/lib/types";

export const dynamicParams = false;

type View = "all" | "home" | "away";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ id: String(l.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const league = leagueById(Number((await params).id));
  return { title: league?.name ?? "League" };
}

function zoneColor(description: string | null): string {
  const d = (description ?? "").toLowerCase();
  if (d.includes("relegation")) return "var(--loss)";
  if (d.includes("champions league") || d.includes("1/8") || d.includes("round of 16")) return "var(--away)";
  if (d.includes("europa") || d.includes("conference") || d.includes("play-off") || d.includes("playoff")) return "#f59e0b";
  return "transparent";
}

function TableBlock({ rows, view, title }: { rows: StandingRow[]; view: View; title?: string }) {
  const zones = [...new Set(rows.map((r) => r.description).filter((d): d is string => !!d))];
  const split = (r: StandingRow) => (view === "home" ? r.home : r.away);
  const ordered =
    view === "all"
      ? rows
      : [...rows].sort((a, b) => {
          const x = split(a), y = split(b);
          const px = x.win * 3 + x.draw, py = y.win * 3 + y.draw;
          return py - px || (y.goals.for - y.goals.against) - (x.goals.for - x.goals.against) || y.goals.for - x.goals.for;
        });
  return (
    <section className="card">
      {title && <div className="card-head"><h2>{title}</h2></div>}
      <div className="table-wrap">
        <table className="data" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th scope="col">#</th><th scope="col" className="left">Team</th>
              <th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th>
              <th scope="col">Goals</th><th scope="col">GD</th><th scope="col">Pts</th>
              {view === "all" && <th scope="col" className="left">Form</th>}
            </tr>
          </thead>
          <tbody>
            {ordered.map((r, idx) => {
              const s = view === "home" ? r.home : view === "away" ? r.away : r.all;
              const gd = s.goals.for - s.goals.against;
              const pts = view === "all" ? r.points : s.win * 3 + s.draw;
              return (
                <tr key={r.team.id}>
                  <td style={{ boxShadow: `inset 3px 0 0 ${view === "all" ? zoneColor(r.description) : "transparent"}`, fontWeight: 600 }}>{view === "all" ? r.rank : idx + 1}</td>
                  <td className="left"><Link href={`/team/${r.team.id}/`} className="team-cell"><Crest src={r.team.logo} alt="" size="sm" />{r.team.name}</Link></td>
                  <td>{s.played}</td><td>{s.win}</td><td>{s.draw}</td><td>{s.lose}</td>
                  <td>{s.goals.for}:{s.goals.against}</td><td>{signed(gd)}</td>
                  <td className="strong">{pts}</td>
                  {view === "all" && <td className="left"><Form form={r.form} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {zones.length > 0 && (
        <div className="legend" style={{ padding: "12px 20px", borderTop: "1px solid var(--line)" }}>
          {zones.map((z) => <span key={z}><i style={{ background: zoneColor(z), width: 10, height: 3 }} />{z}</span>)}
        </div>
      )}
    </section>
  );
}

function Leaders({ title, list, stat }: { title: string; list: PlayerProfile[]; stat: (p: PlayerProfile) => number | null }) {
  return (
    <section className="card">
      <div className="card-head"><h2>{title}</h2></div>
      {list.length === 0 && <p className="empty">No data yet.</p>}
      {list.map((p, i) => {
        const s = p.statistics[0];
        return (
          <Link key={p.player.id} href={`/player/${p.player.id}/`} className="list-row">
            <span className="muted" style={{ width: 18, fontWeight: 600 }}>{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.player.photo} alt="" width={36} height={36} className="avatar" loading="lazy" referrerPolicy="no-referrer" />
            <span className="grow" style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>{p.player.name}</span>
              <span className="muted small">{s?.team.name}</span>
            </span>
            <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18 }}>{stat(p) ?? 0}</span>
          </Link>
        );
      })}
    </section>
  );
}

function FixtureList({ title, list, tz }: { title: string; list: Fixture[]; tz: string }) {
  return (
    <section className="card">
      <div className="card-head"><h2>{title}</h2></div>
      {list.length === 0 && <p className="empty">Nothing to show.</p>}
      {list.map((m) => {
        const st = matchState(m);
        return (
          <div key={m.fixture.id} className="match-row">
            <Link href={`/match/${m.fixture.id}/`} className="match-link">
              <span className="small" style={{ fontWeight: 600, color: st === "live" ? "var(--accent)" : "var(--muted)" }}>
                {st === "scheduled" ? <LocalTime iso={m.fixture.date} serverText={formatLongDate(m.fixture.date, tz)} mode="datetime" /> : statusLabel(m)}
              </span>
              <span className="team-side home"><span>{m.teams.home.name}</span><Crest src={m.teams.home.logo} alt="" /></span>
              <span className={st === "scheduled" ? "score pending" : "score"}>{st === "scheduled" ? "vs" : `${m.goals.home ?? 0} – ${m.goals.away ?? 0}`}</span>
              <span className="team-side"><Crest src={m.teams.away.logo} alt="" /><span>{m.teams.away.name}</span></span>
            </Link>
          </div>
        );
      })}
    </section>
  );
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const league = leagueById(Number((await params).id));
  if (!league) notFound();
  const meta = getMeta();
  const season = meta.window?.season ?? currentSeason();
  const tz = meta.window?.timezone ?? appTimezone();
  const groups = getStandings(league.id)?.league.standings ?? [];
  const scorers = getTopScorers(league.id);
  const assists = getTopAssists(league.id);
  const builtAt = meta.lastRun ? Date.parse(meta.lastRun) / 1000 : 0;
  const fixtures = getSeasonFixtures(league.id);
  const upcoming = fixtures.filter((m) => m.fixture.timestamp >= builtAt && matchState(m) !== "finished").sort((a, b) => a.fixture.timestamp - b.fixture.timestamp).slice(0, 10);
  const recent = fixtures.filter((m) => matchState(m) === "finished").sort((a, b) => b.fixture.timestamp - a.fixture.timestamp).slice(0, 10);

  const tableFor = (view: View) =>
    groups.length === 0 ? (
      <div className="card empty">The table for {seasonLabel(season)} is not available yet.</div>
    ) : (
      <>{groups.map((g, i) => <TableBlock key={i} rows={g} view={view} title={groups.length > 1 ? g[0]?.group : undefined} />)}</>
    );

  const tablePanel = (
    <div className="row">
      <div className="col-main">
        <ClientTabs
          label="Table view"
          variant="chips"
          useHash={false}
          tabs={[{ key: "all", label: "All" }, { key: "home", label: "Home" }, { key: "away", label: "Away" }]}
          panels={{ all: tableFor("all"), home: tableFor("home"), away: tableFor("away") }}
        />
      </div>
      <div className="col-side">
        <Leaders title="Top scorers" list={scorers.slice(0, 5)} stat={(p) => p.statistics[0]?.goals.total ?? null} />
      </div>
    </div>
  );

  const fixturesPanel = (
    <div className="row">
      <div className="col-main"><FixtureList title="Upcoming" list={upcoming} tz={tz} /></div>
      <div className="col-main"><FixtureList title="Recent results" list={recent} tz={tz} /></div>
    </div>
  );

  const playersPanel = (
    <div className="row">
      <div className="col-main"><Leaders title="Goals" list={scorers.slice(0, 20)} stat={(p) => p.statistics[0]?.goals.total ?? null} /></div>
      <div className="col-main"><Leaders title="Assists" list={assists.slice(0, 20)} stat={(p) => p.statistics[0]?.goals.assists ?? null} /></div>
    </div>
  );

  return (
    <main className="page">
      <section className="card page-head">
        <span className="rating" style={{ background: "var(--muted-bg)", color: "var(--accent)", minWidth: 64, height: 64, borderRadius: 16, fontSize: 18, fontFamily: "var(--font-head)" }}>{league.short}</span>
        <div className="grow">
          <h1>{league.name}</h1>
          <span className="muted">{league.country} · {seasonLabel(season)}</span>
        </div>
      </section>
      <ClientTabs
        label="League sections"
        tabs={[
          { key: "table", label: "Table" },
          { key: "fixtures", label: "Fixtures" },
          { key: "players", label: "Player stats" },
        ]}
        panels={{ table: tablePanel, fixtures: fixturesPanel, players: playersPanel }}
      />
    </main>
  );
}
