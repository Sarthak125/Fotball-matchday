import type { Metadata } from "next";
import Link from "next/link";
import Crest from "@/components/Crest";
import NoData from "@/components/NoData";
import Rating from "@/components/Rating";
import { currentSeason, seasonLabel } from "@/lib/config";
import { getMeta, hasTeamPage, playerIndex } from "@/lib/data";
import { per90 } from "@/lib/format";
import { totals } from "@/lib/playerStats";
import type { PlayerProfile } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = [...playerIndex().keys()].map((id) => ({ id: String(id) }));
  return ids.length ? ids : [{ id: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: playerIndex().get(Number((await params).id))?.player.name ?? "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const p: PlayerProfile | undefined = playerIndex().get(Number((await params).id));
  const season = getMeta().window?.season ?? currentSeason();
  if (!p) return <main className="page narrow"><NoData what="player data" /></main>;

  const stats = p.statistics.filter((s) => (s.games.appearences ?? 0) > 0 || (s.games.minutes ?? 0) > 0);
  const t = totals(stats);
  const main = [...stats].sort((a, b) => (b.games.minutes ?? 0) - (a.games.minutes ?? 0))[0] ?? p.statistics[0];
  const fmt = (v: number | null) => (v == null ? "–" : v.toFixed(2));
  const per90Rows = [
    { label: "Goals", v: per90(t.goals, t.minutes) },
    { label: "Assists", v: per90(t.assists, t.minutes) },
    { label: "Shots", v: per90(t.shots, t.minutes) },
    { label: "Shots on target", v: per90(t.shotsOn, t.minutes) },
    { label: "Key passes", v: per90(t.keyPasses, t.minutes) },
    { label: "Successful dribbles", v: per90(t.dribbles, t.minutes) },
    { label: "Tackles", v: per90(t.tackles, t.minutes) },
    { label: "Interceptions", v: per90(t.interceptions, t.minutes) },
  ];

  return (
    <main className="page">
      <section className="card page-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.player.photo} alt="" width={88} height={88} className="avatar" style={{ border: "3px solid var(--accent)" }} referrerPolicy="no-referrer" />
        <div className="grow">
          <h1>{p.player.name}</h1>
          <span className="muted">
            {main && (hasTeamPage(main.team.id) ? <Link href={`/team/${main.team.id}/`}>{main.team.name}</Link> : main.team.name)}
            {main?.games.position ? ` · ${main.games.position}` : ""}
            {main?.games.number ? ` · #${main.games.number}` : ""}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, flex: "1 1 420px" }}>
          {[
            ["Age", p.player.age ?? "–"],
            ["Height", p.player.height ?? "–"],
            ["Nationality", p.player.nationality ?? "–"],
            ["Born", p.player.birth.date ?? "–"],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="muted small">{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        <Link href={`/compare/?a=${p.player.id}`} className="btn">Compare</Link>
      </section>

      {p.player.injured && <div className="alert" role="status">Listed as injured.</div>}

      <section aria-label={`${seasonLabel(season)} totals`} className="stack">
        <h2>{seasonLabel(season)}, covered competitions</h2>
        <div className="tiles">
          <div className="tile"><span className="muted small">Appearances</span><span className="v">{t.apps}</span></div>
          <div className="tile"><span className="muted small">Goals</span><span className="v" style={{ color: "var(--accent)" }}>{t.goals}</span></div>
          <div className="tile"><span className="muted small">Assists</span><span className="v">{t.assists}</span></div>
          <div className="tile"><span className="muted small">Minutes</span><span className="v">{t.minutes.toLocaleString("en-GB")}</span></div>
          <div className="tile"><span className="muted small">Average rating</span><span className="v">{t.rating ? t.rating.toFixed(2) : "–"}</span></div>
          <div className="tile"><span className="muted small">Cards</span><span className="v">{t.yellow}<span className="muted" style={{ fontSize: 16 }}> Y </span>{t.red}<span className="muted" style={{ fontSize: 16 }}> R</span></span></div>
        </div>
      </section>

      <div className="row">
        <section className="card col-main" aria-labelledby="comp-h">
          <div className="card-head"><h2 id="comp-h">By competition</h2></div>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 560 }}>
              <thead><tr><th scope="col" className="left">Competition</th><th scope="col">Apps</th><th scope="col">Mins</th><th scope="col">Goals</th><th scope="col">Assists</th><th scope="col">Rating</th></tr></thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={`${s.league.id}-${s.team.id}-${i}`}>
                    <td className="left"><span className="team-cell" style={{ fontWeight: 500 }}><Crest src={s.league.logo} alt="" size="sm" />{s.league.name} <span className="muted small">({s.team.name})</span></span></td>
                    <td>{s.games.appearences ?? 0}</td>
                    <td>{s.games.minutes ?? 0}</td>
                    <td className="strong">{s.goals.total ?? 0}</td>
                    <td>{s.goals.assists ?? 0}</td>
                    <td><Rating value={s.games.rating ? Number(s.games.rating) : null} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.length === 0 && <p className="empty">No appearances yet this season.</p>}
        </section>

        <section className="card pad col-side stack" aria-labelledby="p90-h">
          <h2 id="p90-h">Per 90 minutes</h2>
          {t.minutes < 90 ? (
            <p className="muted" style={{ margin: 0 }}>Not enough minutes played yet.</p>
          ) : (
            per90Rows.map((r) => (
              <div key={r.label} className="kv"><span className="muted">{r.label}</span><span>{fmt(r.v)}</span></div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
