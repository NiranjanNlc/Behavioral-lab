import { Critique, Direction, Intervention } from "@/simulation/types";
import { formatEffect } from "@/simulation/format";

interface Props {
  interventions: Intervention[];
  direction: Direction;
  critique: Critique | null;
  selectedIds: Set<string>;
}

const niceMax = (n: number) => {
  const step = n <= 10 ? 2 : n <= 30 ? 5 : 10;
  return Math.max(step, Math.ceil(n / step) * step);
};

/** Proposed effect range (struck through once reviewed) against the reviewer's range, per intervention. */
export default function RedlineChart({ interventions, direction, critique, selectedIds }: Props) {
  const reviewFor = (id: string) => critique?.interventions?.find((c) => c.id === id)?.suggestedEffect;
  const max = niceMax(
    Math.max(...interventions.flatMap((iv) => [iv.effect.high, reviewFor(iv.id)?.high ?? 0]), 1)
  );
  const pct = (v: number) => `${(Math.max(0, Math.min(max, v)) / max) * 100}%`;
  const span = (low: number, high: number) => ({
    left: pct(low),
    width: `${Math.max(0.8, ((Math.min(max, high) - Math.max(0, low)) / max) * 100)}%`,
  });
  const word = direction === "decrease" ? "reduction" : "gain";

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg">Proposed vs. reviewed</span>
        <span className="font-mono text-xs text-muted">expected {word}, percentage points</span>
      </figcaption>

      <ul className="space-y-3">
        {interventions.map((iv) => {
          const rev = reviewFor(iv.id);
          const chosen = selectedIds.has(iv.id);
          return (
            <li key={iv.id} className="grid grid-cols-[9rem_1fr] items-center gap-3">
              <span className={`line-clamp-2 text-sm leading-tight ${chosen ? "font-semibold" : "text-ink/80"}`} title={iv.name}>
                {chosen && <span aria-hidden="true">▸ </span>}
                {iv.name}
              </span>
              <div
                className="relative h-6"
                role="img"
                aria-label={`${iv.name}: proposed ${formatEffect(iv.effect, direction)}${
                  rev ? `, reviewer ${formatEffect(rev, direction)}` : ""
                }`}
              >
                <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                <div className="absolute top-0 h-2.5 bg-proposal/40" style={span(iv.effect.low, iv.effect.high)}>
                  <div className="absolute inset-y-0 w-0.5 bg-proposal" style={{ left: `${((iv.effect.medium - iv.effect.low) / Math.max(0.001, iv.effect.high - iv.effect.low)) * 100}%` }} />
                  {rev && <div className="absolute inset-x-0 top-1/2 h-px bg-ink" />}
                </div>
                {rev && (
                  <div className="absolute top-3.5 h-2.5 bg-pen" style={span(rev.low, rev.high)}>
                    <div className="absolute inset-y-0 w-0.5 bg-paper" style={{ left: `${((rev.medium - rev.low) / Math.max(0.001, rev.high - rev.low)) * 100}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 grid grid-cols-[9rem_1fr] gap-3">
        <span />
        <div className="relative h-4 border-t border-ink/60 font-mono text-[0.7rem] text-muted">
          {[0, 0.5, 1].map((f) => (
            <span
              key={f}
              className="absolute top-0.5"
              style={{ left: `${f * 100}%`, transform: f === 1 ? "translateX(-100%)" : f === 0.5 ? "translateX(-50%)" : undefined }}
            >
              {Number((max * f).toFixed(1))}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted">
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-4 bg-proposal/40 align-middle" />
          proposed{critique ? " (struck)" : ""}
        </span>
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-4 bg-pen align-middle" />
          {critique ? "reviewer" : "reviewer range appears after the review"}
        </span>
      </p>
    </figure>
  );
}
