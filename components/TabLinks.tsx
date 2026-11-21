import Link from "next/link";

export default function TabLinks({ tabs, active, label }: { tabs: { key: string; label: string; href: string }[]; active: string; label: string }) {
  return (
    <nav className="tabs" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className="tab" aria-current={active === t.key ? "page" : undefined} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
