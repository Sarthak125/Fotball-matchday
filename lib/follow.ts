"use client";

import { useCallback, useEffect, useState } from "react";

// Followed teams live in this browser only (no accounts yet).
const KEY = "matchday.followedTeams.v2";
const EVENT = "matchday:follow-change";

export interface FollowedTeam {
  id: number;
  name: string;
  logo: string;
}

function isTeam(x: unknown): x is FollowedTeam {
  if (!x || typeof x !== "object") return false;
  const t = x as Record<string, unknown>;
  return typeof t.id === "number" && typeof t.name === "string" && typeof t.logo === "string";
}

function read(): FollowedTeam[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isTeam).slice(0, 50) : [];
  } catch {
    return [];
  }
}

function write(teams: FollowedTeam[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(teams));
  } catch {
    // Storage can be unavailable (private mode). Following just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useFollowedTeams() {
  const [teams, setTeams] = useState<FollowedTeam[]>([]);
  useEffect(() => {
    const sync = () => setTeams(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = useCallback((team: FollowedTeam) => {
    const cur = read();
    write(cur.some((t) => t.id === team.id) ? cur.filter((t) => t.id !== team.id) : [...cur, team]);
  }, []);
  return { teams, ids: teams.map((t) => t.id), toggle };
}
