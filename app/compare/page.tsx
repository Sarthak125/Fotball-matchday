import Link from "next/link";
import ErrorNotice from "@/components/ErrorNotice";
import { getPlayer, getTopScorers } from "@/lib/api";
import { currentSeason, LEAGUES, seasonLabel } from "@/lib/config";
import { per90 } from "@/lib/format";
import { totals, type PlayerTotals } from "@/lib/playerStats";
import type { PlayerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare players" };

function parseId(v: unknown): number | null {
  return typeof v === "string" && /^\d{1,10}$/.test(v) ? Number(v) : null;
}

const ROWS: { label: string; key: keyof PlayerTotals; per90: boolean }[] = [
  { label: "Appearances", key: "apps", per90: false },
  { label: "Minutes", key: "minutes", per90: false },
  { label: "Goals", key: "goals", per90: true },
  { label: "Assists", key: "assists", per90: true },
  { label: "Shots", key: "shots", per90: true },
  { label: "Shots on target", key: "shotsOn", per90: true },
  { label: "Key passes", key: "keyPasses", per90: true },
  { label: "Successful dribbles", key: "dribbles", per90: true },
  { label: "Tackles", key: "tackles", per90: true },
  { label: "Interceptions", key: "interceptions", per90: true },
  { label: "Average rating", key: "rating", per90: false },
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; basis?: string }> }) {
  const sp = await searchParams;
  const a = parseId(sp.a);
  const b = parseId(sp.b);
  const basis = sp.basis === "total" ? "total" : "p90";
  const season = currentSeason();

  let options: { id: number; label: string; group: string }[] = [];
  let players: (PlayerProfile | null)[] = [];
  let error: unknown = null;
  try {
    const lists = await Promise.all(LEAGUES.map((l) => getTopScorers(l.id, season).then((list) => ({ l, list }))));
    const seen = new Set<number>();
    for (const { l, list } of lists) {
      for (const p of list.slice(0, 20)) {
        if (seen.has(p.player.id)) continue;
        seen.add(p.player.id);
        options.push({ id: p.player.id, label: `${p.player.name} (${p.statistics[0]?.team.name ?? ""})`, group: l.name });
      }
    }
    players = await Promise.all([a, b].map((id) => (id ? getPlayer(id, season) : Promise.resolve(null))));
    for (const p of players) {
      if (p && !options.some((o) => o.id === p.player.id)) options = [{ id: p.player.id, label: p.player.name, group: "Selected" }, ...options];
    }
  } catch (err) {
    error = err;
  }

  const [pa, pb] = players;
  const ta = pa ? totals(pa.statistics) : null;
  const tb = pb ? totals(pb.statistics) : null;
  const groups = [...new Set(options.map((o) => o.group))];

  const value = (t: PlayerTotals, row: (typeof ROWS)[number]): number | null => {
    const raw = t[row.key];
    if (raw == null) return null;
    return basis === "p90" && row.per90 ? per90(raw, t.minutes) : raw;
  };
  const show = (v: number | null, row: (typeof ROWS)[number]) =>
    v == null ? "–" : row.key === "rating" || (basis === "p90" && row.per90) ? v.toFixed(2) : v.toLocaleString("en-GB");

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <div>
        <h1>Compare players</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>{seasonLabel(season)}, all competitions</p>
      </div>

      {error ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          <form method="get" className="card pad" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            {(["a", "b"] as const).map((slot, i) => (
              <label key={slot} className="field" style={{ flex: "1 1 260px" }}>
                Player {i + 1}
                <select name={slot} defaultValue={String((slot === "a" ? a : b) ?? "")} className="select">
                  <option value="">Choose a player</option>
                  {groups.map((g) => (
                    <optgroup key={g} label={g}>
                      {options.filter((o) => o.group === g).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              Show
              <select name="basis" defaultValue={basis} className="select">
                <option value="p90">Per 90 minutes</option>
                <option value="total">Season totals</option>
              </select>
            </label>
            <button type="submit" className="btn primary">Compare</button>
          </form>
          <p className="note">The list shows the top scorers in each competition. Open any player page and press Compare to add someone else.</p>

          {ta && tb && pa && pb ? (
            <section className="card pad stack" aria-label="Comparison">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Link href={`/player/${pa.player.id}`} style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>{pa.player.name}</Link>
                <Link href={`/player/${pb.player.id}`} style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18, color: "var(--away)", textAlign: "right" }}>{pb.player.name}</Link>
              </div>
              {ROWS.map((row) => {
                const va = value(ta, row);
                const vb = value(tb, row);
                const max = Math.max(va ?? 0, vb ?? 0) || 1;
                return (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) 150px minmax(0,1fr) 64px", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, color: (va ?? 0) >= (vb ?? 0) ? "var(--text)" : "var(--faint)" }}>{show(va, row)}</span>
                    <div className="pct" style={{ display: "block" }}><div className="track" style={{ display: "flex", justifyContent: "flex-end" }}><div className="fill" style={{ width: `${((va ?? 0) / max) * 100}%`, background: "var(--accent)" }} /></div></div>
                    <span className="muted small" style={{ textAlign: "center" }}>{row.label}</span>
                    <div className="pct" style={{ display: "block" }}><div className="track"><div className="fill" style={{ width: `${((vb ?? 0) / max) * 100}%`, background: "var(--away)" }} /></div></div>
                    <span style={{ fontWeight: 700, textAlign: "right", color: (vb ?? 0) >= (va ?? 0) ? "var(--text)" : "var(--faint)" }}>{show(vb, row)}</span>
                  </div>
                );
              })}
            </section>
          ) : (
            <div className="card empty">Choose two players to compare.</div>
          )}
        </>
      )}
    </main>
  );
}
