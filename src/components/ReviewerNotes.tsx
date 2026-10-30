import { Critique, Intervention } from "@/simulation/types";

interface Props {
  critique: Critique;
  interventions: Intervention[];
  onSelectCombination: (ids: string[]) => void;
}

export default function ReviewerNotes({ critique, interventions, onSelectCombination }: Props) {
  const name = (id: string) => interventions.find((i) => i.id === id)?.name ?? id;
  const valid = (ids: string[]) => ids.filter((id) => interventions.some((i) => i.id === id));

  return (
    <section aria-label="Reviewer's verdict">
      <h3 className="font-display text-lg">Reviewer&apos;s verdict</h3>
      <p className="mb-2 font-mono text-xs text-muted">skeptical policy reviewer · Nemotron 3 Ultra</p>
      <p className="border-l-4 border-pen pl-3 text-[0.95rem]">{critique.overallAssessment}</p>

      {critique.recommendedCombinations?.length > 0 && (
        <div className="mt-4">
          <h4 className="font-display text-base">Worth combining</h4>
          <ul className="mt-1 space-y-2">
            {critique.recommendedCombinations.map((c, i) => {
              const ids = valid(c.interventionIds);
              return (
                <li key={i} className="text-sm">
                  <span className="font-medium">{ids.map(name).join(" + ")}.</span> {c.rationale}{" "}
                  {ids.length > 0 && (
                    <button
                      onClick={() => onSelectCombination(ids)}
                      className="whitespace-nowrap font-mono text-xs text-pen underline underline-offset-2"
                    >
                      simulate this
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {critique.caveats?.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary>Caveats</summary>
          <ul className="mt-1 list-disc pl-5">
            {critique.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
