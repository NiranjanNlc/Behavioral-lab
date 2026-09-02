"use client";

import { SimulationResult } from "@/simulation/types";

interface Props {
  result: SimulationResult;
}

export default function SimulationResults({ result }: Props) {
  const relativePercent = (result.relativeChange * 100).toFixed(1);

  return (
    <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Simulation Results</h2>

      {/* Bar visualization */}
      <div className="mb-6 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Baseline</span>
            <span className="font-medium">{result.baselineRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div
              className="bg-gray-500 h-6 rounded-full"
              style={{ width: `${result.baselineRate}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Predicted</span>
            <span className="font-medium">{result.predictedRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div
              className="bg-blue-500 h-6 rounded-full"
              style={{ width: `${result.predictedRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-500">Absolute Change</p>
          <p className="text-lg font-bold text-green-700">
            +{result.absoluteChange} percentage points
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-500">Relative Change</p>
          <p className="text-lg font-bold text-green-700">+{relativePercent}%</p>
        </div>
      </div>

      {/* Mechanism */}
      <div className="p-3 bg-blue-50 rounded mb-4">
        <p className="text-sm font-medium text-blue-900">
          Mechanism ({result.intervention.name})
        </p>
        <p className="text-sm text-blue-800">{result.intervention.mechanism}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 italic">
        Illustrative simulation — not a real-world causal prediction.
      </p>
    </div>
  );
}
