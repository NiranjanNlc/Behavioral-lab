import { createRng, runCombinedSimulation } from "./engine";
import { Budget, Direction, Intervention } from "./types";

/** "NPR 50 lakh", "USD 12 thousand". */
export function formatMoney(amount: number, { currency, unit }: Budget): string {
  return `${currency} ${Number(amount.toFixed(1))}${unit ? ` ${unit}` : ""}`;
}

export const totalCost = (ivs: Intervention[]) => ivs.reduce((sum, iv) => sum + iv.cost, 0);

/** Improvement toward the goal in percentage points: positive means the rate moved the right way. */
export const goalGain = (baseline: number, rate: number, direction: Direction) =>
  direction === "decrease" ? baseline - rate : rate - baseline;

export const meetsTarget = (rate: number, target: number, direction: Direction) =>
  direction === "decrease" ? rate <= target : rate >= target;

/** Share of simulated rates (0–1) that reach the target. */
export function successChance(samples: number[], target: number, direction: Direction): number {
  if (samples.length === 0) return 0;
  return samples.filter((r) => meetsTarget(r, target, direction)).length / samples.length;
}

/** Slider range for the bet, in percentage points of gain. */
export function betBounds(baseline: number, direction: Direction, claim: number) {
  const room = direction === "decrease" ? baseline : 100 - baseline;
  const max = Math.max(1, Math.min(room, Math.ceil(Math.max(2, claim * 1.6))));
  return { max, step: max <= 5 ? 0.1 : 0.5 };
}

/**
 * 0–100. The bet is compared with the reviewer-adjusted median gain. The error is scaled by the gain
 * the optimistic simulation claimed, so a miss of 1pp costs more on a small effect than on a large one.
 */
export function calibrationScore(bet: number, reviewedGain: number, optimisticGain: number): number {
  const scale = Math.max(1, Math.abs(optimisticGain));
  return Math.round(Math.max(0, 100 - (Math.abs(bet - reviewedGain) / scale) * 100));
}

/** Percentage points of gain per unit of budget spent. */
export const efficiency = (gain: number, spent: number) => (spent > 0 ? gain / spent : 0);

export type Rank = "Optimist" | "Analyst" | "Skeptic" | "Red Pen";

export function rankTitle(avgCalibration: number): Rank {
  if (avgCalibration > 85) return "Red Pen";
  if (avgCalibration > 65) return "Skeptic";
  if (avgCalibration > 40) return "Analyst";
  return "Optimist";
}

export interface HistogramDot {
  /** x position as a fraction of the axis (0–1). */
  x: number;
  /** Stack index within its bin, from the floor. */
  stack: number;
  /** Drop order (shuffled) used to stagger the animation. */
  order: number;
  kind: "hit" | "short" | "worse";
}

export interface Histogram {
  lo: number;
  hi: number;
  dots: HistogramDot[];
  maxStack: number;
}

/**
 * Turns sorted simulated rates into a small, representative dot histogram (one dot per quantile),
 * so the "Plinko" drop stays light while keeping the real shape of the distribution.
 */
export function buildHistogram(
  samples: number[],
  opts: { target: number; baseline: number; direction: Direction; dots?: number; bins?: number }
): Histogram {
  const { target, baseline, direction, dots = 240, bins = 28 } = opts;
  const n = Math.min(dots, samples.length);
  const points: number[] = [];
  for (let i = 0; i < n; i++) points.push(samples[Math.floor(((i + 0.5) / n) * samples.length)]);

  const spread = Math.max(...points, target, baseline) - Math.min(...points, target, baseline);
  const pad = Math.max(1, spread * 0.08);
  const lo = Math.max(0, Math.floor(Math.min(...points, target, baseline) - pad));
  const hi = Math.min(100, Math.ceil(Math.max(...points, target, baseline) + pad));
  const span = Math.max(1, hi - lo);

  const stacks = new Array<number>(bins).fill(0);
  const rng = createRng(7);
  const order = points.map((_, i) => i).sort(() => rng() - 0.5);

  const out: HistogramDot[] = points.map((rate, i) => {
    const bin = Math.min(bins - 1, Math.floor(((rate - lo) / span) * bins));
    const stack = stacks[bin]++;
    return {
      x: (bin + 0.5) / bins,
      stack,
      order: order[i],
      kind: meetsTarget(rate, target, direction)
        ? "hit"
        : goalGain(baseline, rate, direction) < 0
          ? "worse"
          : "short",
    };
  });

  return { lo, hi, dots: out, maxStack: Math.max(1, ...stacks) };
}

/**
 * Best median gain (percentage points toward the goal) over every affordable subset of interventions,
 * using the effect ranges currently on the interventions.
 */
export function bestPortfolioGain(
  baseline: number,
  direction: Direction,
  interventions: Intervention[],
  budget: number
): number {
  let best = 0;
  for (let mask = 1; mask < 1 << interventions.length; mask++) {
    const picked = interventions.filter((_, i) => mask & (1 << i));
    if (totalCost(picked) > budget) continue;
    const sim = runCombinedSimulation(baseline, picked, { direction, trials: 1500 });
    best = Math.max(best, goalGain(baseline, sim.medianRate, direction));
  }
  return best;
}

/** A target `fraction` of the way to what the best affordable portfolio achieves, at least 0.5pp. */
export function targetFromGain(baseline: number, direction: Direction, bestGain: number, fraction: number): number {
  const gain = Math.max(0.5, Math.round(bestGain * fraction * 10) / 10);
  const rate = baseline + (direction === "decrease" ? -gain : gain);
  return Math.round(Math.min(100, Math.max(0, rate)) * 10) / 10;
}
