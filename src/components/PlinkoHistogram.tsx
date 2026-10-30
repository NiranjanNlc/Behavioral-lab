import { formatPct } from "@/simulation/format";
import { Histogram } from "@/simulation/game";

interface Props {
  histogram: Histogram;
  target: number;
  successShare: number;
}

const HEIGHT = 150;

/** Simulated outcomes falling into a histogram, with the target as a vertical line. */
export default function PlinkoHistogram({ histogram, target, successShare }: Props) {
  const { lo, hi, dots, maxStack } = histogram;
  const size = Math.max(3, Math.min(7, Math.floor(HEIGHT / maxStack)));
  const pos = (v: number) => ((v - lo) / Math.max(1, hi - lo)) * 100;
  const color = { hit: "bg-ink", short: "bg-pen/60", worse: "bg-pen ring-1 ring-ink" } as const;

  return (
    <figure>
      <figcaption className="mb-2">
        <span className="font-display text-lg">5,000 draws, reviewer-adjusted</span>
        <span className="block font-mono text-xs text-muted">each dot is about 20 draws</span>
      </figcaption>
      <div
        className="relative overflow-hidden border-b border-ink/60"
        style={{ height: HEIGHT + 18 }}
        role="img"
        aria-label={`${Math.round(successShare * 100)}% of draws reach the target of ${formatPct(target)}`}
      >
        {dots.map((d, i) => (
          <span
            key={i}
            className={`dot ${color[d.kind]}`}
            style={{
              width: size,
              height: size,
              left: `calc(${d.x * 100}% - ${size / 2}px)`,
              bottom: d.stack * size + 1,
              animationDelay: `${d.order * 9}ms`,
              ["--fall" as string]: `-${HEIGHT + 20}px`,
            }}
          />
        ))}
        <div className="absolute inset-y-0 w-[3px] bg-ink" style={{ left: `calc(${pos(target)}% - 1px)` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.7rem] text-muted">
        <span>{lo}%</span>
        <span className="font-semibold text-ink">Target {formatPct(target)}</span>
        <span>{hi}%</span>
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-ink align-middle" /> reaches the target
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-pen/60 align-middle" /> falls short
      </p>
    </figure>
  );
}
