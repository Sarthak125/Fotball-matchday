import LineupBuilder from "@/components/LineupBuilder";
import NoData from "@/components/NoData";
import { leagueById } from "@/lib/config";
import { teamIndex } from "@/lib/data";

export const metadata = { title: "Lineup Builder" };

export default function LineupBuilderPage() {
  const teams = [...teamIndex().values()]
    .map((t) => ({ id: t.id, name: t.name, logo: t.logo, league: leagueById(t.leagues[0])?.name ?? "Other" }))
    .sort((a, b) => a.league.localeCompare(b.league) || a.name.localeCompare(b.name));
  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <div>
        <h1>Lineup Builder</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>Pick a team and formation, then choose a player for each position. Your lineup is saved in this browser.</p>
      </div>
      {teams.length === 0 ? <NoData what="team data" /> : <LineupBuilder teams={teams} />}
    </main>
  );
}
