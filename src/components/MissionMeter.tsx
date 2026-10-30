import { formatPct } from "@/simulation/format";
import { Direction } from "@/simulation/types";

interface Props {
  baseline: number;
  target: number;
  /** Where the fill currently ends. Equals the baseline until a result is shown. */
  value: number;
  direction: Direction;
  /** The user's bet, shown as a dashed marker (in rate terms). */
  betRate?: number | null;
  /** Other values the axis should keep in view so it does not rescale during the reveal. */
  extras?: number[];
  tone: "plain" | "optimistic" | "reviewed";
  verdict?: "met" | "missed" | null;
}

/** Progress toward the mission target on an axis zoomed to the relevant range. */
export default function MissionMeter({ baseline, target, value, direction, betRate, extras = [], tone, verdict }: Props) {
  const points = [baseline, target, value, ...extras, ...(betRate != null ? [betRate] : [])];
  const span = Math.max(...points) - Math.min(...points);
  const pad = Math.max(2, span * 0.12);
  const lo = Math.max(0, Math.floor(Math.min(...points) - pad));
  const hi = Math.min(100, Math.ceil(Math.max(...points) + pad));
  const pos = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / Math.max(1, hi - lo)) * 100;

  const sign = direction === "decrease" ? -1 : 1;
  const needed = sign * (target - baseline);
  const done = needed === 0 ? 0 : Math.round((sign * (value - baseline) / needed) * 100);
  const fillColor = tone === "reviewed" ? "bg-pen" : tone === "optimistic" ? "bg-proposal" : "bg-ink/30";

  return (
    <div>
      <div className="relative h-14" role="img" aria-label={`Progress toward the target: ${formatPct(value)} now, target ${formatPct(target)}`}>
        <div className="absolute inset-x-0 top-6 h-5 border border-ink/60 bg-white/40" />
        <div
          className={`meter-fill absolute top-6 h-5 ${fillColor}`}
          style={{ left: `${Math.min(pos(baseline), pos(value))}%`, width: `${Math.abs(pos(value) - pos(baseline))}%` }}
        />
        <div className="absolute top-4 h-9 w-px bg-ink" style={{ left: `${pos(baseline)}%` }} />
        <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[0.7rem] text-muted" style={{ left: `${pos(baseline)}%` }}>
          Now {formatPct(baseline)}
        </span>
        <div className="absolute top-3 h-11 w-[3px] bg-ink" style={{ left: `calc(${pos(target)}% - 1px)` }} />
        <span
          className="absolute -top-0.5 whitespace-nowrap font-mono text-[0.7rem] font-semibold"
          style={{ left: `${pos(target)}%`, transform: pos(target) > 85 ? "translateX(-100%)" : "translateX(6px)" }}
        >
          Target {formatPct(target)}
        </span>
        {betRate != null && (
          <>
            <div className="absolute top-5 h-7 border-l-2 border-dashed border-pen" style={{ left: `${pos(betRate)}%` }} />
            <span className="absolute top-[3.1rem] -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] text-pen" style={{ left: `${pos(betRate)}%` }}>
              your bet
            </span>
          </>
        )}
      </div>
      <p className="mt-1 flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-muted">
        <span>
          {lo}% – {hi}%
        </span>
        <span className={verdict === "missed" ? "font-semibold text-pen" : verdict === "met" ? "font-semibold text-ink" : ""}>
          {verdict === "met"
            ? `Target reached · ${formatPct(value)}`
            : verdict === "missed"
              ? `Target missed · ${formatPct(value)}`
              : `${Math.max(0, done)}% of the way to the target`}
        </span>
      </p>
    </div>
  );
}
