"use client";

import { useState } from "react";
import { Intervention, SimulationResult } from "@/simulation/types";
import { scenario, interventions } from "@/simulation/data";
import { runSimulation } from "@/simulation/engine";
import InterventionCard from "@/components/InterventionCard";
import SimulationResults from "@/components/SimulationResults";

export default function Home() {
  const [selected, setSelected] = useState<Intervention | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleRun = () => {
    if (!selected) return;
    setResult(runSimulation(scenario.baselineRate, selected));
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">BEHAVIORLAB</h1>
        <h2 className="text-xl text-gray-700 mb-6">{scenario.goal}</h2>

        <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Target</p>
          <p className="font-medium text-gray-900 mb-2">{scenario.target}</p>
          <p className="text-sm text-gray-500">Current participation</p>
          <p className="text-2xl font-bold text-gray-900">{scenario.baselineRate}%</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Select an Intervention
        </h3>
        <div className="space-y-3 mb-6">
          {interventions.map((iv) => (
            <InterventionCard
              key={iv.id}
              intervention={iv}
              selected={selected?.id === iv.id}
              onSelect={setSelected}
            />
          ))}
        </div>

        <button
          onClick={handleRun}
          disabled={!selected}
          className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          RUN SIMULATION
        </button>

        {result && <SimulationResults result={result} />}
      </div>
    </main>
  );
}
