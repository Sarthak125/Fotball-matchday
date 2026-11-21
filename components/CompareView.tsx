"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface ComparePlayer {
  id: number;
  name: string;
  team: string;
  group: string;
  totals: Record<string, number | null>;
}

const ROWS: { label: string; key: string; per90: boolean }[] = [
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

export default function CompareView({ players }: { players: ComparePlayer[] }) {
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [basis, setBasis] = useState<"p90" | "total">("p90");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = (v: string | null) => (v && /^\d+$/.test(v) && players.some((p) => p.id === Number(v)) ? Number(v) : null);
    setA(n(q.get("a")));
    setB(n(q.get("b")));
  }, [players]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (a) q.set("a", String(a));
    if (b) q.set("b", String(b));
    const s = q.toString();
    history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [a, b]);

  const pa = players.find((p) => p.id === a);
  const pb = players.find((p) => p.id === b);
  const groups = [...new Set(players.map((p) => p.group))];

  const value = (p: ComparePlayer, row: (typeof ROWS)[number]) => {
    const raw = p.totals[row.key];
    if (raw == null) return null;
    const mins = p.totals.minutes ?? 0;
    return basis === "p90" && row.per90 ? (mins ? (raw / mins) * 90 : null) : raw;
  };
  const show = (v: number | null, row: (typeof ROWS)[number]) =>
    v == null ? "–" : row.key === "rating" || (basis === "p90" && row.per90) ? v.toFixed(2) : v.toLocaleString("en-GB");

  const picker = (label: string, val: number | null, set: (n: number | null) => void) => (
    <label className="field" style={{ flex: "1 1 260px" }}>
      {label}
      <select className="select" value={val ?? ""} onChange={(e) => set(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Choose a player</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {players.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.team})</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="card pad" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        {picker("Player 1", a, setA)}
        {picker("Player 2", b, setB)}
        <label className="field">
          Show
          <select className="select" value={basis} onChange={(e) => setBasis(e.target.value === "total" ? "total" : "p90")}>
            <option value="p90">Per 90 minutes</option>
            <option value="total">Season totals</option>
          </select>
        </label>
      </div>
      <p className="note">You can compare the top scorers and assist leaders in each competition.</p>

      {pa && pb ? (
        <section className="card pad stack" aria-label="Comparison">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Link href={`/player/${pa.id}/`} style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>{pa.name}</Link>
            <Link href={`/player/${pb.id}/`} style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18, color: "var(--away)", textAlign: "right" }}>{pb.name}</Link>
          </div>
          {ROWS.map((row) => {
            const va = value(pa, row);
            const vb = value(pb, row);
            const max = Math.max(va ?? 0, vb ?? 0) || 1;
            return (
              <div key={row.key} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) 140px minmax(0,1fr) 64px", alignItems: "center", gap: 10 }}>
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
  );
}
