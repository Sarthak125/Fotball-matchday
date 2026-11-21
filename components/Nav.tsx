"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Matches", match: (p: string) => p === "/" || p.startsWith("/match") },
  { href: "/leagues", label: "Leagues", match: (p: string) => p.startsWith("/league") || p.startsWith("/team") || p.startsWith("/player") },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/lineup-builder", label: "Lineup Builder", match: (p: string) => p.startsWith("/lineup-builder") },
];

export default function Nav() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Matchday home">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="12" stroke="#C6F432" strokeWidth="2" />
          <path d="M14 8l5 3.6-1.9 5.9h-6.2L9 11.6z" fill="#C6F432" />
        </svg>
        Matchday
      </Link>
      <nav aria-label="Main" className="nav-links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.match(pathname) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
