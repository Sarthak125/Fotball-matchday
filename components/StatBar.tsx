import { statNumber } from "@/lib/format";

export default function StatBar({ label, home, away }: { label: string; home: number | string | null; away: number | string | null }) {
  const h = statNumber(home);
  const a = statNumber(away);
  const total = h + a;
  const pct = total > 0 ? Math.round((h / total) * 100) : 50;
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{home ?? 0}</span>
        <span className="muted">{label}</span>
        <span>{away ?? 0}</span>
      </div>
      <div className="bars" aria-hidden="true">
        <div className="h" style={{ width: `${pct}%` }} />
        <div className="a" />
      </div>
    </div>
  );
}
