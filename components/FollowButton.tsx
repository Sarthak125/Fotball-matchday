"use client";

import { useFollowedTeams } from "@/lib/follow";

export default function FollowButton({ team }: { team: { id: number; name: string; logo: string } }) {
  const { ids, toggle } = useFollowedTeams();
  const on = ids.includes(team.id);
  return (
    <button type="button" className={on ? "btn primary" : "btn"} aria-pressed={on} onClick={() => toggle(team)}>
      {on ? "Following" : "Follow"}
      <span className="sr-only"> {team.name}</span>
    </button>
  );
}
