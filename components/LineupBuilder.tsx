"use client";

import { useEffect, useMemo, useState } from "react";

interface Team { id: number; name: string; logo: string; league: string }
interface SquadPlayer { id: number; name: string; number: number | null; position: string }

const FORMATIONS: Record<string, string[][]> = {
  "4-3-3": [["LW", "ST", "RW"], ["CM", "CM", "CM"], ["LB", "CB", "CB", "RB"], ["GK"]],
  "4-2-3-1": [["ST"], ["LM", "AM", "RM"], ["DM", "DM"], ["LB", "CB", "CB", "RB"], ["GK"]],
  "4-4-2": [["ST", "ST"], ["LM", "CM", "CM", "RM"], ["LB", "CB", "CB", "RB"], ["GK"]],
  "3-5-2": [["ST", "ST"], ["LWB", "CM", "CM", "CM", "RWB"], ["CB", "CB", "CB"], ["GK"]],
  "3-4-3": [["LW", "ST", "RW"], ["LM", "CM", "CM", "RM"], ["CB", "CB", "CB"], ["GK"]],
};

const STORE = "matchday.lineup.v1";

interface Saved { teamId: number | null; formation: string; picks: Record<string, number> }

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORE);
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return {
      teamId: typeof v.teamId === "number" ? v.teamId : null,
      formation: typeof v.formation === "string" && FORMATIONS[v.formation] ? v.formation : "4-3-3",
      picks: v.picks && typeof v.picks === "object" ? (v.picks as Record<string, number>) : {},
    };
  } catch {
    return { teamId: null, formation: "4-3-3", picks: {} };
  }
}

export default function LineupBuilder({ teams }: { teams: Team[] }) {
  const [state, setState] = useState<Saved>({ teamId: null, formation: "4-3-3", picks: {} });
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setState(load()), []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  useEffect(() => {
    if (!state.teamId) return;
    const ctrl = new AbortController();
    setStatus("loading");
    fetch(`/api/squad/${state.teamId}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = (await r.json()) as { players?: SquadPlayer[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Could not load the squad.");
        setSquad(body.players ?? []);
        setStatus("idle");
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Could not load the squad.");
      });
    return () => ctrl.abort();
  }, [state.teamId]);

  const rows = FORMATIONS[state.formation];
  const slots = useMemo(() => rows.flatMap((row, r) => row.map((pos, c) => ({ key: `${r}-${c}`, pos }))), [rows]);
  const used = new Set(Object.values(state.picks));
  const byId = new Map(squad.map((p) => [p.id, p]));
  const team = teams.find((t) => t.id === state.teamId);
  const leagues = [...new Set(teams.map((t) => t.league))];

  const share = async () => {
    const lines = rows.map((row, r) => row.map((pos, c) => `${pos}: ${byId.get(state.picks[`${r}-${c}`])?.name ?? "-"}`).join(", "));
    const text = `${team?.name ?? "My"} XI (${state.formation})\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copy failed. Your browser may block clipboard access.");
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card pad" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <label className="field" style={{ flex: "1 1 260px" }}>
          Team
          <select className="select" value={state.teamId ?? ""} onChange={(e) => setState({ ...state, teamId: e.target.value ? Number(e.target.value) : null, picks: {} })}>
            <option value="">Choose a team</option>
            {leagues.map((l) => (
              <optgroup key={l} label={l}>
                {teams.filter((t) => t.league === l).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Formation" className="chips">
          {Object.keys(FORMATIONS).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={state.formation === f} onClick={() => setState({ ...state, formation: f, picks: {} })}>{f}</button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={share} disabled={!team}>{copied ? "Copied" : "Copy lineup"}</button>
      </div>

      {status === "error" && <div className="alert" role="alert">{message}</div>}
      {status === "loading" && <p className="muted" role="status">Loading squad…</p>}

      <div style={{ borderRadius: 12, background: "var(--pitch)", border: "2px solid var(--pitch-line)", padding: "20px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: "flex", justifyContent: "space-around", gap: 6, flexWrap: "wrap" }}>
            {row.map((pos, c) => {
              const key = `${r}-${c}`;
              const pick = state.picks[key];
              return (
                <label key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 128 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", fontSize: 12, fontWeight: 700, background: pick ? "var(--accent)" : "transparent", color: pick ? "#0b0f14" : "var(--text-2)", border: pick ? "0" : "2px dashed #5b7a66" }}>{pos}</span>
                  <span className="sr-only">Player for {pos}</span>
                  <select
                    className="select"
                    style={{ width: "100%", minHeight: 36, fontSize: 12, padding: "0 6px" }}
                    value={pick ?? ""}
                    disabled={!squad.length}
                    onChange={(e) => {
                      const picks = { ...state.picks };
                      if (e.target.value) picks[key] = Number(e.target.value);
                      else delete picks[key];
                      setState({ ...state, picks });
                    }}
                  >
                    <option value="">Pick</option>
                    {["Goalkeeper", "Defender", "Midfielder", "Attacker"].map((g) => (
                      <optgroup key={g} label={g}>
                        {squad.filter((p) => p.position === g && (!used.has(p.id) || p.id === pick)).map((p) => (
                          <option key={p.id} value={p.id}>{p.number ? `${p.number}. ` : ""}{p.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <p className="note">{slots.length - Object.keys(state.picks).length} positions left to fill.</p>
    </div>
  );
}
