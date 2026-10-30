"use client";

import { SimulationResult } from "@/simulation/types";

interface Props {
  result: SimulationResult;
}

export default function SimulationResults({ result }: Props) {
  const { baselineRate, worstRate, p5Rate, p95Rate, bestRate, expectedRate } = result;
  const sign = result.expectedChange >= 0 ? "+" : "";

  return (
    <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Simulation Results</h2>
      <p className="text-sm text-gray-500 mb-4">
        {result.intervention.name} · {result.trials.toLocaleString()} randomized trials
      </p>

      {/* Uncertainty range on a 0–100% axis */}
      <div className="mb-6">
        <div className="relative h-8 bg-gray-100 rounded">
          <div
            className="absolute top-2 h-4 bg-gray-300 rounded"
            style={{ left: `${worstRate}%`, width: `${Math.max(0.5, bestRate - worstRate)}%` }}
            title="Worst to best case"
          />
          <div
            className="absolute top-1 h-6 bg-blue-300 rounded"
            style={{ left: `${p5Rate}%`, width: `${Math.max(0.5, p95Rate - p5Rate)}%` }}
            title="90% of trials"
          />
          <div className="absolute top-0 h-8 w-0.5 bg-gray-700" style={{ left: `${baselineRate}%` }} title="Baseline" />
          <div className="absolute top-0 h-8 w-1 bg-blue-700" style={{ left: `${expectedRate}%` }} title="Expected" />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <span className="inline-block w-2 h-2 bg-gray-700 mr-1" />baseline
          <span className="inline-block w-2 h-2 bg-blue-700 mx-1 ml-3" />expected
          <span className="inline-block w-2 h-2 bg-blue-300 mx-1 ml-3" />90% range
          <span className="inline-block w-2 h-2 bg-gray-300 mx-1 ml-3" />worst–best
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Baseline" value={`${baselineRate}%`} />
        <Stat label="Expected" value={`${expectedRate}%`} sub={`${sign}${result.expectedChange}pp`} />
        <Stat label="90% range" value={`${p5Rate}–${p95Rate}%`} />
        <Stat label="Worst / best" value={`${worstRate} / ${bestRate}%`} />
        <Stat label="Relative change" value={`${sign}${(result.relativeChange * 100).toFixed(1)}%`} />
        <Stat label="Chance of improvement" value={`${(result.probabilityOfImprovement * 100).toFixed(0)}%`} />
      </div>

      <div className="p-3 bg-blue-50 rounded mb-4">
        <p className="text-sm font-medium text-blue-900">Mechanism ({result.intervention.name})</p>
        <p className="text-sm text-blue-800">{result.intervention.mechanism}</p>
      </div>

      <p className="text-xs text-gray-400 italic">
        Probabilistic simulation over estimated effect ranges — not a real-world causal prediction.
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}
