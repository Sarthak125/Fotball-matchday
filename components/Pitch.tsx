import Link from "next/link";
import Rating from "./Rating";
import type { Lineup, LineupPlayer } from "@/lib/types";

function columns(players: LineupPlayer[]): LineupPlayer[][] {
  const byRow = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const [row, col] = (p.player.grid ?? "").split(":").map(Number);
    if (!Number.isFinite(row)) continue;
    const list = byRow.get(row) ?? [];
    list.push({ ...p, player: { ...p.player, grid: `${row}:${Number.isFinite(col) ? col : 0}` } });
    byRow.set(row, list);
  }
  return [...byRow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => list.sort((x, y) => Number(x.player.grid!.split(":")[1]) - Number(y.player.grid!.split(":")[1])));
}

function kit(l: Lineup, fallback: string) {
  const primary = l.team.colors?.player?.primary;
  const number = l.team.colors?.player?.number;
  const hex = (v?: string) => (v && /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : null);
  return { bg: hex(primary) ?? fallback, fg: hex(number) ?? "#0b0f14" };
}

function Half({ lineup, side, ratings }: { lineup: Lineup; side: "home" | "away"; ratings: Map<number, number> }) {
  const cols = columns(lineup.startXI);
  const colors = kit(lineup, side === "home" ? "#c6f432" : "#5ab0ff");
  return (
    <div className={`half ${side}`}>
      {cols.map((col, i) => (
        <div key={i} className="line" style={{ flexDirection: side === "away" ? "column-reverse" : "column" }}>
          {col.map((p) => (
            <Link key={p.player.id} href={`/player/${p.player.id}`} className="pp">
              <span className="shirt" style={{ background: colors.bg, color: colors.fg }}>
                {p.player.number ?? ""}
                <Rating value={ratings.get(p.player.id) ?? null} />
              </span>
              <span className="nm">{p.player.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Pitch({ home, away, ratings }: { home: Lineup; away: Lineup; ratings: Map<number, number> }) {
  const hasGrid = [...home.startXI, ...away.startXI].every((p) => p.player.grid);
  if (!hasGrid) return null;
  return (
    <div className="pitch-wrap">
      <div className="pitch">
        <div className="mid" />
        <div className="circle" />
        <div className="box l" />
        <div className="box r" />
        <Half lineup={home} side="home" ratings={ratings} />
        <Half lineup={away} side="away" ratings={ratings} />
      </div>
    </div>
  );
}
