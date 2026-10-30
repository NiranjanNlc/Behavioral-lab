import { formatPct, formatPp, formatProbability } from "@/simulation/format";
import { Rank } from "@/simulation/game";

export interface Score {
  missionMet: boolean;
  chance: number;
  finalRate: number;
  target: number;
  bet: number;
  reviewedGain: number;
  optimisticGain: number;
  calibration: number;
  efficiencyLabel: string;
  spentLabel: string;
}

interface Props {
  score: Score;
  rank: Rank;
  runs: number;
  avgCalibration: number;
  onRetry: () => void;
}

export default function ScoreCard({ score, rank, runs, avgCalibration, onRetry }: Props) {
  return (
    <section aria-labelledby="score-heading" className="fade-in border-2 border-ink p-4">
      <h3 id="score-heading" className="font-display text-xl">
        {score.missionMet ? "Mission accomplished" : "Mission failed"}
      </h3>
      <p className="font-mono text-xs text-muted">
        reviewer-adjusted median {formatPct(score.finalRate)} vs target {formatPct(score.target)}
      </p>

      <dl className="mt-3 divide-y divide-rule border-y border-rule">
        <Row label="Chance of success" value={formatProbability(score.chance)} note="share of draws that reach the target" />
        <Row
          label="Calibration"
          value={`${score.calibration} / 100`}
          note={`you bet ${formatPp(score.bet)}, reviewed median ${formatPp(score.reviewedGain)}; the optimistic claim was ${formatPp(score.optimisticGain)}`}
          accent
        />
        <Row label="Efficiency" value={score.efficiencyLabel} note={`for ${score.spentLabel} spent`} />
      </dl>

      <p className="mt-3 text-sm">
        Rank: <span className="font-display text-lg font-semibold text-pen">{rank}</span>{" "}
        <span className="font-mono text-xs text-muted">
          avg calibration {Math.round(avgCalibration)} over {runs} run{runs === 1 ? "" : "s"}
        </span>
      </p>

      <button onClick={onRetry} className="mt-3 w-full border border-ink px-5 py-2 font-medium hover:bg-ink hover:text-paper">
        Swap one intervention and try again
      </button>
    </section>
  );
}

function Row({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm">{label}</dt>
        <dd className={`font-mono text-lg font-medium tabular-nums ${accent ? "text-pen" : ""}`}>{value}</dd>
      </div>
      <p className="font-mono text-[0.7rem] text-muted">{note}</p>
    </div>
  );
}
