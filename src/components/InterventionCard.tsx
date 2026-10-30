"use client";

import { Intervention } from "@/simulation/types";

interface Props {
  intervention: Intervention;
  selected: boolean;
  onSelect: (intervention: Intervention) => void;
}

export default function InterventionCard({ intervention, selected, onSelect }: Props) {
  const { effect, evidenceType, evidenceStrength, citations, assumptions } = intervention;
  const empirical = evidenceType === "empirical";

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button onClick={() => onSelect(intervention)} className="w-full text-left p-4">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{intervention.name}</h3>
          <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded whitespace-nowrap">
            +{effect.low} / {effect.medium} / {effect.high}pp
          </span>
        </div>
        <div className="flex gap-2 mb-2">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              empirical ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {empirical ? "Research-backed" : "Hypothesis"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            {evidenceStrength} evidence
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{intervention.description}</p>
        <p className="text-xs text-gray-500">
          <span className="font-medium">Mechanism:</span> {intervention.mechanism}
        </p>
      </button>
      {(assumptions.length > 0 || citations.length > 0) && (
        <details className="px-4 pb-3 text-xs text-gray-600">
          <summary className="cursor-pointer text-gray-500">Assumptions &amp; sources</summary>
          {assumptions.length > 0 && (
            <ul className="list-disc ml-4 mt-1">
              {assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
          {citations.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {citations.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    {c.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}
