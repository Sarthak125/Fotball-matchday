"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the server-rendered page on an interval while something is live. Pauses when the tab is hidden. */
export default function AutoRefresh({ seconds, enabled }: { seconds: number; enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [enabled, seconds, router]);
  return null;
}
