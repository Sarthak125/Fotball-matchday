"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Tabs that switch on the client. All panels are in the static HTML; the URL hash
 * (for example #lineup) remembers the open tab so links can point to it.
 */
export default function ClientTabs({
  tabs,
  panels,
  label,
  variant = "tabs",
  useHash = true,
}: {
  tabs: { key: string; label: string }[];
  panels: Record<string, ReactNode>;
  label: string;
  variant?: "tabs" | "chips";
  useHash?: boolean;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  useEffect(() => {
    if (!useHash) return;
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (tabs.some((t) => t.key === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs, useHash]);

  const pick = (key: string) => {
    setActive(key);
    if (useHash) history.replaceState(null, "", key === tabs[0]?.key ? window.location.pathname + window.location.search : `#${key}`);
  };

  return (
    <>
      <div role="tablist" aria-label={label} className={variant === "tabs" ? "tabs" : "chips"}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-controls={`panel-${t.key}`}
            aria-selected={active === t.key}
            className={variant === "tabs" ? "tab" : "chip"}
            aria-pressed={variant === "chips" ? active === t.key : undefined}
            onClick={() => pick(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={active !== t.key} style={active === t.key ? { display: "flex", flexDirection: "column", gap: 20 } : undefined}>
          {panels[t.key]}
        </div>
      ))}
    </>
  );
}
