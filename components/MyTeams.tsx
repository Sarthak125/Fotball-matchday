"use client";

import Link from "next/link";
import Crest from "./Crest";
import { useFollowedTeams } from "@/lib/follow";

export default function MyTeams() {
  const { teams } = useFollowedTeams();
  return (
    <section className="card">
      <div className="card-head"><h2 className="label" style={{ fontFamily: "inherit" }}>My teams</h2></div>
      {teams.length === 0 ? (
        <p className="muted small" style={{ padding: "12px 20px", margin: 0 }}>Follow teams from their page to see them here.</p>
      ) : (
        teams.map((t) => (
          <Link key={t.id} href={`/team/${t.id}`} className="list-row">
            <Crest src={t.logo} alt="" />
            <span className="grow" style={{ fontWeight: 600 }}>{t.name}</span>
          </Link>
        ))
      )}
    </section>
  );
}
