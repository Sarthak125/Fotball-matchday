"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Crest from "./Crest";
import LocalTime from "./LocalTime";
import { useFollowedTeams } from "@/lib/follow";

export interface MatchItem {
  id: number;
  league: { id: number; name: string; logo: string; round: string | null };
  state: "live" | "finished" | "scheduled" | "off";
  status: string | null;
  kickoffIso: string;
  kickoffText: string;
  timestamp: number;
  home: { id: number; name: string; logo: string };
  away: { id: number; name: string; logo: string };
  goals: { home: number | null; away: number | null };
}

type Filter = "all" | "live" | "time" | "following";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "time", label: "By time" },
  { key: "following", label: "Following" },
];

export default function MatchesView({ matches, leagueOrder }: { matches: MatchItem[]; leagueOrder: number[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { ids: followed } = useFollowedTeams();
  const liveCount = matches.filter((m) => m.state === "live").length;

  const groups = useMemo(() => {
    let list = matches;
    if (filter === "live") list = list.filter((m) => m.state === "live");
    if (filter === "following") list = list.filter((m) => followed.includes(m.home.id) || followed.includes(m.away.id));
    if (filter === "time") {
      const rank = (m: MatchItem) => (m.state === "live" ? 0 : m.state === "scheduled" ? 1 : 2);
      const sorted = [...list].sort((a, b) => rank(a) - rank(b) || a.timestamp - b.timestamp);
      return sorted.length ? [{ key: "all", name: "All competitions", logo: "", round: "Live first, then by kick-off", leagueId: 0, rows: sorted }] : [];
    }
    return leagueOrder
      .map((lid) => {
        const rows = list.filter((m) => m.league.id === lid).sort((a, b) => a.timestamp - b.timestamp);
        const first = rows[0];
        return first ? { key: String(lid), name: first.league.name, logo: first.league.logo, round: first.league.round, leagueId: lid, rows } : null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [matches, filter, followed, leagueOrder]);

  return (
    <>
      <div role="group" aria-label="Filter matches" className="chips">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.key === "live" ? `Live (${liveCount})` : f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="card empty">
          {filter === "following" && followed.length === 0
            ? "You are not following any teams yet. Open a team and press Follow."
            : "No matches for this filter on this day."}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="card" aria-label={g.name}>
          {g.leagueId ? (
            <Link href={`/league/${g.leagueId}`} className="group-head">
              <Crest src={g.logo} alt="" size="sm" />
              <span>{g.name}</span>
              {g.round && <span className="muted small" style={{ fontWeight: 500 }}>{g.round}</span>}
            </Link>
          ) : (
            <div className="group-head">
              <span>{g.name}</span>
              <span className="muted small" style={{ fontWeight: 500 }}>{g.round}</span>
            </div>
          )}
          {g.rows.map((m) => {
            const isFollowed = followed.includes(m.home.id) || followed.includes(m.away.id);
            const showScore = m.state !== "scheduled" && m.goals.home != null;
            return (
              <div key={m.id} className="match-row">
                <Link href={`/match/${m.id}`} className="match-link" aria-label={`${m.home.name} versus ${m.away.name}`}>
                  <span>
                    {m.state === "live" && <span className="live">{m.status}</span>}
                    {m.state === "scheduled" && (
                      <span style={{ color: "var(--text-2)", fontWeight: 600, fontSize: 13 }}>
                        <LocalTime iso={m.kickoffIso} serverText={m.kickoffText} />
                      </span>
                    )}
                    {(m.state === "finished" || m.state === "off") && <span className="muted small" style={{ fontWeight: 600 }}>{m.status}</span>}
                  </span>
                  <span className="team-side home">
                    <span>{m.home.name}</span>
                    <Crest src={m.home.logo} alt="" />
                  </span>
                  <span className={showScore ? "score" : "score pending"}>{showScore ? `${m.goals.home} – ${m.goals.away}` : "vs"}</span>
                  <span className="team-side">
                    <Crest src={m.away.logo} alt="" />
                    <span>{m.away.name}</span>
                  </span>
                </Link>
                <span style={{ width: 36, display: "inline-flex", justifyContent: "center", color: "var(--accent)" }}>
                  {isFollowed && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Team you follow">
                      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
                    </svg>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
