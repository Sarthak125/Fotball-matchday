export default function Form({ form }: { form: string | null | undefined }) {
  if (!form) return null;
  const letters = form.slice(-5).split("").filter((c) => c === "W" || c === "D" || c === "L");
  const words = { W: "win", D: "draw", L: "loss" } as const;
  return (
    <span className="form" aria-label={`Last ${letters.length}: ${letters.map((l) => words[l as "W" | "D" | "L"]).join(", ")}`}>
      {letters.map((l, i) => (
        <span key={i} className={l} aria-hidden="true">{l}</span>
      ))}
    </span>
  );
}
