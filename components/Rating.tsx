import { ratingColor } from "@/lib/format";

export default function Rating({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <span className="rating" style={{ background: ratingColor(value) }} aria-label={`Rating ${value.toFixed(1)}`}>
      {value.toFixed(1)}
    </span>
  );
}
