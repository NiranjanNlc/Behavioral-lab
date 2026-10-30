import {
  CombinedSimulationResult,
  EffectRange,
  Intervention,
  SimulationOptions,
  SimulationResult,
} from "./types";

export const DEFAULT_TRIALS = 5000;
const DEFAULT_SEED = 42;

/** Each additional stacked nudge delivers less than its standalone effect. */
export const OVERLAP_DISCOUNT = 0.2;

/** Small seedable PRNG (mulberry32) so simulations are reproducible. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Samples a triangular distribution with the given low / mode / high. */
export function sampleTriangular({ low, medium, high }: EffectRange, u: number): number {
  if (high <= low) return medium;
  const split = (medium - low) / (high - low);
  return u < split
    ? low + Math.sqrt(u * (high - low) * (medium - low))
    : high - Math.sqrt((1 - u) * (high - low) * (high - medium));
}

const clampRate = (r: number) => Math.min(100, Math.max(0, r));
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function monteCarlo(
  baselineRate: number,
  ranges: EffectRange[],
  { trials = DEFAULT_TRIALS, seed = DEFAULT_SEED, direction = "increase", keepSamples = false }: SimulationOptions
): Omit<SimulationResult, "intervention"> {
  const rng = createRng(seed);
  const sign = direction === "decrease" ? -1 : 1;
  const discount = Math.max(0, 1 - OVERLAP_DISCOUNT * (ranges.length - 1));
  const rates: number[] = new Array(trials);
  let improved = 0;

  for (let t = 0; t < trials; t++) {
    let total = 0;
    for (const range of ranges) total += sampleTriangular(range, rng());
    const rate = clampRate(baselineRate + sign * total * discount);
    rates[t] = rate;
    if (sign * (rate - baselineRate) > 0) improved++;
  }

  rates.sort((a, b) => a - b);
  const mean = rates.reduce((s, r) => s + r, 0) / trials;
  const lowest = rates[0];
  const highest = rates[trials - 1];

  return {
    baselineRate,
    direction,
    trials,
    expectedRate: round(mean),
    medianRate: round(percentile(rates, 0.5)),
    p5Rate: round(percentile(rates, 0.05)),
    p95Rate: round(percentile(rates, 0.95)),
    worstRate: round(direction === "decrease" ? highest : lowest),
    bestRate: round(direction === "decrease" ? lowest : highest),
    expectedChange: round(mean - baselineRate),
    relativeChange: baselineRate === 0 ? 0 : round((mean - baselineRate) / baselineRate, 3),
    probabilityOfImprovement: round(improved / trials, 3),
    ...(keepSamples ? { samples: rates } : {}),
  };
}

/** Monte Carlo simulation of a single intervention using its low/medium/high effect range. */
export function runSimulation(
  baselineRate: number,
  intervention: Intervention,
  options: SimulationOptions = {}
): SimulationResult {
  return { intervention, ...monteCarlo(baselineRate, [intervention.effect], options) };
}

/** Simulates several interventions applied together, with diminishing returns for overlap. */
export function runCombinedSimulation(
  baselineRate: number,
  interventions: Intervention[],
  options: SimulationOptions = {}
): CombinedSimulationResult {
  return {
    interventions,
    ...monteCarlo(
      baselineRate,
      interventions.map((i) => i.effect),
      options
    ),
  };
}
