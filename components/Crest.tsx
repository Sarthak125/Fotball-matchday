/* eslint-disable @next/next/no-img-element */
// Plain <img> keeps us off Next's image optimiser, which would need the provider's
// media host allow-listed and would spend server CPU on tiny logos.
export default function Crest({ src, alt, size = "" }: { src: string | null | undefined; alt: string; size?: "" | "sm" | "md" | "lg" }) {
  if (!src) return <span className={`crest ${size}`} aria-hidden="true" />;
  return <img src={src} alt={alt} className={`crest ${size}`} loading="lazy" referrerPolicy="no-referrer" />;
}
