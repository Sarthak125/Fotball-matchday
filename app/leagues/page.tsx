import Link from "next/link";
import { LEAGUES, currentSeason, seasonLabel } from "@/lib/config";

export const metadata = { title: "Leagues" };

export default function LeaguesPage() {
  return (
    <main className="page narrow">
      <h1>Leagues</h1>
      <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {LEAGUES.map((l) => (
          <Link key={l.id} href={`/league/${l.id}/`} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text)" }}>
            <span className="label">{l.country}</span>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700 }}>{l.name}</span>
            <span className="muted small">Season {seasonLabel(currentSeason())}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
