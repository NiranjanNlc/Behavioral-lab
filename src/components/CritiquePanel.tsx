"use client";

import { Critique, Intervention } from "@/simulation/types";

interface Props {
  critique: Critique;
  interventions: Intervention[];
  onApplySuggested: () => void;
}

export default function CritiquePanel({ critique, interventions, onApplySuggested }: Props) {
  const name = (id: string) => interventions.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Critical Review</h2>
      <p className="text-sm text-gray-500 mb-3">Skeptical policy reviewer (Nemotron Ultra)</p>
      <p className="text-sm text-gray-800 mb-4">{critique.overallAssessment}</p>

      <div className="space-y-3 mb-4">
        {critique.interventions?.map((c) => (
          <div key={c.id} className="p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium text-gray-900">
              {name(c.id)} <span className="text-xs text-gray-500">· {c.evidenceVerdict} evidence</span>
            </p>
            <p className="text-gray-700"><span className="font-medium">Comparability:</span> {c.comparability}</p>
            <p className="text-gray-700"><span className="font-medium">Effect realism:</span> {c.effectRealism}</p>
            {c.suggestedEffect && (
              <p className="text-gray-700">
                <span className="font-medium">Reviewer&apos;s range:</span> +{c.suggestedEffect.low} / {c.suggestedEffect.medium} / {c.suggestedEffect.high}pp
              </p>
            )}
            {c.concerns?.length > 0 && (
              <ul className="list-disc ml-5 text-gray-600">
                {c.concerns.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      {critique.interventions?.some((c) => c.suggestedEffect) && (
        <button
          onClick={onApplySuggested}
          className="mb-4 px-4 py-2 rounded text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
        >
          Apply reviewer&apos;s ranges to simulation
        </button>
      )}

      {critique.recommendedCombinations?.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Recommended combinations</h3>
          {critique.recommendedCombinations.map((c, i) => (
            <p key={i} className="text-sm text-gray-700">
              <span className="font-medium">{c.interventionIds.map(name).join(" + ")}:</span> {c.rationale}
            </p>
          ))}
        </div>
      )}

      {critique.caveats?.length > 0 && (
        <ul className="list-disc ml-5 text-xs text-gray-500">
          {critique.caveats.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
    </div>
  );
}
