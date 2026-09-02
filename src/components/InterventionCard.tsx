"use client";

import { Intervention } from "@/simulation/types";

interface Props {
  intervention: Intervention;
  selected: boolean;
  onSelect: (intervention: Intervention) => void;
}

export default function InterventionCard({ intervention, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(intervention)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-semibold text-gray-900">{intervention.name}</h3>
        <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
          +{intervention.effect}pp
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{intervention.description}</p>
      <p className="text-xs text-gray-500">
        <span className="font-medium">Mechanism:</span> {intervention.mechanism}
      </p>
    </button>
  );
}
