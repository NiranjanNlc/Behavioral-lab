import { EvidenceStrength, EvidenceType } from "@/simulation/types";

/** One scale for evidence quality: ●●●○ strong, ●●○○ moderate, ●○○○ weak or hypothesis. */
export function evidenceLevel(type: EvidenceType, strength: EvidenceStrength) {
  if (type === "hypothesis") return { dots: 1, label: "hypothesis" };
  if (strength === "strong") return { dots: 3, label: "strong evidence" };
  if (strength === "moderate") return { dots: 2, label: "moderate evidence" };
  return { dots: 1, label: "weak evidence" };
}

export default function EvidenceScale({
  type,
  strength,
}: {
  type: EvidenceType;
  strength: EvidenceStrength;
}) {
  const { dots, label } = evidenceLevel(type, strength);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs text-muted">
      <span aria-hidden="true" className="tracking-[0.15em] text-ink">
        {"●".repeat(dots)}
        <span className="text-rule">{"●".repeat(4 - dots)}</span>
      </span>
      {label}
    </span>
  );
}
