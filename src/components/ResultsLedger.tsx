import { formatPct, formatProbability, formatSignedPp } from "@/simulation/format";
import { CombinedSimulationResult, Direction, SimulationResult } from "@/simulation/types";

type Sim = Omit<SimulationResult, "intervention"> | CombinedSimulationResult;

export interface LedgerRow {
  key: string;
  label: string;
  optimistic: Sim;
  adjusted: Sim | null;
}

interface Props {
  rows: LedgerRow[];
  baselineRate: number;
  direction: Direction;
  reviewing: boolean;
}

export default function ResultsLedger({ rows, baselineRate, direction, reviewing }: Props) {
  // Zoom the axis to the data (plus padding) instead of 0–100%.
  const all = rows.flatMap((r) => [r.optimistic, r.adjusted].filter((s): s is Sim => !!s));
  const lo = Math.max(0, Math.floor(Math.min(baselineRate, ...all.map((s) => s.p5Rate)) - 2));
  const hi = Math.min(100, Math.ceil(Math.max(baselineRate, ...all.map((s) => s.p95Rate)) + 2));
  const pos = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / Math.max(1, hi - lo)) * 100}%`;
  const verb = direction === "decrease" ? "lower" : "higher";

  return (
    <section aria-label="Simulation results">
      <h3 className="font-display text-lg">Simulated outcome</h3>
      <p className="mb-3 font-mono text-xs text-muted">
        baseline {formatPct(baselineRate)} · goal is a {verb} rate · 5,000 Monte Carlo draws
      </p>

      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.key}>
            <p className="font-display text-base">{row.label}</p>
            <div className="mt-1 grid grid-cols-2 gap-4">
              <Column title="Optimistic" sim={row.optimistic} tone="proposal" pos={pos} lo={lo} hi={hi} baselineRate={baselineRate} />
              {row.adjusted ? (
                <Column title="Reviewer-adjusted" sim={row.adjusted} tone="pen" pos={pos} lo={lo} hi={hi} baselineRate={baselineRate} />
              ) : (
                <div className="border-t border-rule pt-2 font-mono text-xs text-muted">
                  {reviewing ? "Reviewer checking citations and effect sizes…" : "Review unavailable."}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs italic text-muted">
        Probabilistic simulation over estimated effect ranges, not a real-world causal prediction.
      </p>
    </section>
  );
}

function Column({
  title,
  sim,
  tone,
  pos,
  lo,
  hi,
  baselineRate,
}: {
  title: string;
  sim: Sim;
  tone: "proposal" | "pen";
  pos: (v: number) => string;
  lo: number;
  hi: number;
  baselineRate: number;
}) {
  const color = tone === "pen" ? "bg-pen" : "bg-proposal";
  const text = tone === "pen" ? "text-pen" : "text-proposal";
  return (
    <div className="border-t-2 border-ink pt-2">
      <p className={`font-mono text-[0.7rem] uppercase tracking-wide ${text}`}>{title}</p>
      <p className="font-mono text-2xl font-medium tabular-nums">{formatPct(sim.expectedRate)}</p>
      <p className="font-mono text-xs tabular-nums text-muted">{formatSignedPp(sim.expectedChange)} vs baseline</p>

      <div
        className="relative mt-2 h-3"
        role="img"
        aria-label={`90% of draws between ${formatPct(sim.p5Rate)} and ${formatPct(sim.p95Rate)}`}
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        <div
          className={`absolute inset-y-0 opacity-45 ${color}`}
          style={{ left: pos(sim.p5Rate), width: `calc(${pos(sim.p95Rate)} - ${pos(sim.p5Rate)})`, minWidth: 3 }}
        />
        <div className={`absolute -inset-y-0.5 w-0.5 ${color}`} style={{ left: pos(sim.expectedRate) }} />
        <div className="absolute -inset-y-1 w-px bg-ink" style={{ left: pos(baselineRate) }} />
      </div>
      <div className="flex justify-between font-mono text-[0.65rem] text-muted">
        <span>{lo}%</span>
        <span>{hi}%</span>
      </div>

      <dl className="mt-1 font-mono text-xs tabular-nums text-muted">
        <div className="flex justify-between">
          <dt>90% range</dt>
          <dd>
            {formatPct(sim.p5Rate)}–{formatPct(sim.p95Rate)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Worst / best</dt>
          <dd>
            {formatPct(sim.worstRate)} / {formatPct(sim.bestRate)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Improves</dt>
          <dd>{formatProbability(sim.probabilityOfImprovement)}</dd>
        </div>
      </dl>
    </div>
  );
}
