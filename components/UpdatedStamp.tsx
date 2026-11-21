"use client";

import { useEffect, useState } from "react";

function ago(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** "Updated 25 min ago". Scores on this site refresh on a schedule, not live. */
export default function UpdatedStamp({ iso }: { iso: string | undefined }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!iso) return;
    const update = () => setText(ago(Date.now() - new Date(iso).getTime()));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);
  if (!iso) return <span className="muted small">Not updated yet</span>;
  return (
    <span className="muted small" title={new Date(iso).toUTCString()}>
      Data updated <time dateTime={iso}>{text ?? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC"}</time>
    </span>
  );
}
