"use client";

import { useEffect, useState } from "react";

/**
 * Shows a kick-off time in the viewer's own time zone.
 * The server renders the app time zone first, then the browser swaps in local time.
 */
export default function LocalTime({ iso, serverText, mode = "time" }: { iso: string; serverText: string; mode?: "time" | "datetime" }) {
  const [text, setText] = useState(serverText);
  useEffect(() => {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions =
      mode === "time" ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
    setText(new Intl.DateTimeFormat(undefined, opts).format(d));
  }, [iso, mode]);
  return <time dateTime={iso}>{text}</time>;
}
