import ErrorNotice from "@/components/ErrorNotice";
import LineupBuilder from "@/components/LineupBuilder";
import { getStandings } from "@/lib/api";
import { LEAGUES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lineup Builder" };

export default async function LineupBuilderPage() {
  let teams: { id: number; name: string; logo: string; league: string }[] = [];
  let error: unknown = null;
  try {
    const tables = await Promise.all(LEAGUES.map((l) => getStandings(l.id).then((s) => ({ l, s }))));
    const seen = new Set<number>();
    for (const { l, s } of tables) {
      for (const row of (s?.league.standings ?? []).flat()) {
        if (seen.has(row.team.id)) continue;
        seen.add(row.team.id);
        teams.push({ id: row.team.id, name: row.team.name, logo: row.team.logo, league: l.name });
      }
    }
    teams = teams.sort((a, b) => a.league.localeCompare(b.league) || a.name.localeCompare(b.name));
  } catch (err) {
    error = err;
  }
  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <div>
        <h1>Lineup Builder</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>Pick a team and formation, then choose a player for each position. Your lineup is saved in this browser.</p>
      </div>
      {error ? <ErrorNotice error={error} /> : <LineupBuilder teams={teams} />}
    </main>
  );
}
