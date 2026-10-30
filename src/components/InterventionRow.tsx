"use client";

import { cleanTitle, formatEffect, hostname } from "@/simulation/format";
import { Critique, Direction, Intervention } from "@/simulation/types";
import EvidenceScale from "./EvidenceScale";

interface Props {
  index: number;
  intervention: Intervention;
  direction: Direction;
  selected: boolean;
  onToggle: (id: string) => void;
  review?: Critique["interventions"][number];
  /** Illustrative cost label, e.g. "NPR 8 lakh". */
  costLabel: string;
  /** Why the row cannot be ticked right now (over budget, reveal in progress). */
  blockedReason?: string;
}

export default function InterventionRow({ index, intervention, direction, selected, onToggle, review, costLabel, blockedReason }: Props) {
  const { effect, assumptions, citations } = intervention;
  const concern = review?.concerns?.[0];
  const blocked = !selected && !!blockedReason;

  return (
    <li className={`border-t border-rule border-l-4 ${selected ? "border-l-ink bg-white/50" : "border-l-transparent"}`}>
      <button
        role="checkbox"
        aria-checked={selected}
        disabled={blocked}
        onClick={() => onToggle(intervention.id)}
        className={`grid w-full grid-cols-[1.75rem_1fr] gap-x-3 px-3 pt-4 pb-2 text-left ${blocked ? "opacity-45" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`mt-1 flex h-5 w-5 items-center justify-center border text-sm leading-none ${
            selected ? "border-ink bg-ink text-paper" : "border-ink/50 text-transparent"
          }`}
        >
          ✓
        </span>
        <span>
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-display text-xl leading-snug">
              <span className="mr-2 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
              {intervention.name}
            </span>
            <EvidenceScale type={intervention.evidenceType} strength={intervention.evidenceStrength} />
          </span>
          <span className="mt-0.5 block font-mono text-xs tabular-nums">
            Cost {costLabel}
            {blocked && <span className="ml-2 text-pen">· {blockedReason}</span>}
          </span>
          <span className="mt-1 block text-[0.95rem] text-ink/80">{intervention.description}</span>
          <span className="mt-2 block">
            <span className={`font-mono text-xs tabular-nums ${review ? "redpen" : "text-proposal"}`}>
              Proposed {formatEffect(effect, direction)}
            </span>
          </span>
          {review?.suggestedEffect && (
            <span className="fade-in block font-mono text-xs tabular-nums font-medium text-pen" style={{ animationDelay: "350ms" }}>
              Reviewer {formatEffect(review.suggestedEffect, direction)}
            </span>
          )}
          {concern && (
            <span className="fade-in mt-1.5 block text-sm text-pen" style={{ animationDelay: "500ms" }}>
              <span aria-hidden="true">⚠ </span>
              <span className="sr-only">Reviewer concern: </span>
              {concern}
            </span>
          )}
        </span>
      </button>

      <details className="px-3 pb-3 pl-[3.25rem] text-sm text-muted">
        <summary className="inline-block">Mechanism, assumptions, sources</summary>
        <p className="mt-2">
          <span className="font-medium text-ink">Mechanism.</span> {intervention.mechanism}
        </p>
        {assumptions.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
        {review && (
          <div className="mt-2 space-y-1 text-ink/80">
            <p>
              <span className="font-medium text-ink">Comparability.</span> {review.comparability}
            </p>
            <p>
              <span className="font-medium text-ink">Effect realism.</span> {review.effectRealism}
            </p>
            {review.concerns?.length > 1 && (
              <ul className="list-disc pl-5 text-pen">
                {review.concerns.slice(1).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {citations.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {citations.map((c) => (
              <li key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2 hover:decoration-ink">
                  {cleanTitle(c.title, c.url)}
                </a>{" "}
                <span className="font-mono text-xs">{hostname(c.url)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 italic">No supporting source cited.</p>
        )}
      </details>
    </li>
  );
}
