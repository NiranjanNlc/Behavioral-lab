"use client";

import { useState, useSyncExternalStore } from "react";
import { Critique, Intervention, SimulationResult } from "@/simulation/types";
import { getLabState, setLabState, subscribeLabState } from "@/simulation/store";
import { generateScenario, requestCritique } from "@/simulation/client";
import { runSimulation } from "@/simulation/engine";
import InterventionCard from "@/components/InterventionCard";
import SimulationResults from "@/components/SimulationResults";
import CritiquePanel from "@/components/CritiquePanel";

type Busy = "generate" | "critique" | null;

export default function Home() {
  const { scenario, interventions } = useSyncExternalStore(subscribeLabState, getLabState, getLabState);
  const [goal, setGoal] = useState("Increase on-time VAT filing among Nepali SMEs");
  const [selected, setSelected] = useState<Intervention | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [critique, setCritique] = useState<Critique | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setBusy("generate");
    setError(null);
    try {
      await generateScenario(goal.trim());
      setSelected(null);
      setResult(null);
      setCritique(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleRun = () => {
    if (!selected) return;
    setResult(runSimulation(scenario.baselineRate, selected));
  };

  const handleCritique = async () => {
    setBusy("critique");
    setError(null);
    try {
      setCritique(await requestCritique(scenario, interventions));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Critical evaluation failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleApplySuggested = () => {
    if (!critique) return;
    const next = interventions.map((iv) => {
      const s = critique.interventions?.find((c) => c.id === iv.id)?.suggestedEffect;
      if (!s || ![s.low, s.medium, s.high].every(Number.isFinite)) return iv;
      const [low, medium, high] = [s.low, s.medium, s.high].sort((a, b) => a - b);
      return { ...iv, effect: { low, medium, high } };
    });
    setLabState({ scenario, interventions: next });
    setSelected(null);
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">BEHAVIORLAB</h1>
        <p className="text-gray-600 mb-6">
          Simulate which behavioral nudges are most likely to work — and how sure we can be.
        </p>

        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <label htmlFor="goal" className="text-sm text-gray-500">Policy goal</label>
          <div className="flex gap-2 mt-1">
            <input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
            />
            <button
              onClick={handleGenerate}
              disabled={!goal.trim() || busy !== null}
              className="px-4 py-2 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {busy === "generate" ? "Researching…" : "Build scenario"}
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl text-gray-800 mb-2">{scenario.goal}</h2>
          <p className="text-sm text-gray-500">Target</p>
          <p className="font-medium text-gray-900 mb-2">{scenario.target}</p>
          <p className="text-sm text-gray-500">Baseline rate</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {scenario.baselineRate}%
            <span
              className={`ml-2 align-middle text-xs font-medium px-2 py-0.5 rounded ${
                scenario.baselineBasis === "assumed" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {{ user: "provided by you", evidence: "from cited evidence", assumed: "assumed — not measured" }[scenario.baselineBasis]}
            </span>
          </p>
          <p className="text-sm text-gray-600">{scenario.context}</p>
          {scenario.sources.length > 0 && (
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer text-gray-500">
                {scenario.sources.length} web sources (Tavily)
              </summary>
              <ul className="mt-1 space-y-0.5">
                {scenario.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">Select an Intervention</h3>
        <p className="text-xs text-gray-500 mb-3">Effect shown as low / medium / high gain in percentage points.</p>
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

        <div className="flex gap-3">
          <button
            onClick={handleRun}
            disabled={!selected}
            className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            RUN SIMULATION
          </button>
          <button
            onClick={handleCritique}
            disabled={busy !== null}
            className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy === "critique" ? "Reviewing…" : "CRITICAL REVIEW"}
          </button>
        </div>

        {result && <SimulationResults result={result} />}
        {critique && <CritiquePanel critique={critique} interventions={interventions} onApplySuggested={handleApplySuggested} />}
      </div>
    </main>
  );
}
