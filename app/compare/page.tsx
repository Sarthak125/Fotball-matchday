import CompareView, { type ComparePlayer } from "@/components/CompareView";
import NoData from "@/components/NoData";
import { currentSeason, leagueById, seasonLabel } from "@/lib/config";
import { getMeta, playerIndex } from "@/lib/data";
import { totals } from "@/lib/playerStats";

export const metadata = { title: "Compare players" };

export default function ComparePage() {
  const season = getMeta().window?.season ?? currentSeason();
  const players: ComparePlayer[] = [...playerIndex().values()]
    .map((p) => {
      const main = [...p.statistics].sort((x, y) => (y.games.minutes ?? 0) - (x.games.minutes ?? 0))[0];
      const t = totals(p.statistics);
      return {
        id: p.player.id,
        name: p.player.name,
        team: main?.team.name ?? "",
        group: leagueById(main?.league.id ?? 0)?.name ?? "Other",
        totals: { ...t },
      };
    })
    .sort((x, y) => x.group.localeCompare(y.group) || x.name.localeCompare(y.name));

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <div>
        <h1>Compare players</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>{seasonLabel(season)}</p>
      </div>
      {players.length === 0 ? <NoData what="player data" /> : <CompareView players={players} />}
    </main>
  );
}
