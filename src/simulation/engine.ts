import { Intervention, SimulationResult } from "./types";

export function runSimulation(
  baselineRate: number,
  intervention: Intervention
): SimulationResult {
  const predictedRate = Math.min(100, Math.max(0, baselineRate + intervention.effect));
  const absoluteChange = predictedRate - baselineRate;
  const relativeChange = baselineRate === 0 ? 0 : absoluteChange / baselineRate;

  return {
    intervention,
    baselineRate,
    predictedRate,
    absoluteChange,
    relativeChange,
  };
}
