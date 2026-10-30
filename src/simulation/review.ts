import { Critique, Intervention } from "./types";

/** Returns the interventions with the reviewer's own effect ranges swapped in where valid. */
export function withReviewerEffects(interventions: Intervention[], critique: Critique): Intervention[] {
  return interventions.map((iv) => {
    const s = critique.interventions?.find((c) => c.id === iv.id)?.suggestedEffect;
    if (!s || ![s.low, s.medium, s.high].every((n) => Number.isFinite(Number(n)))) return iv;
    const [low, medium, high] = [s.low, s.medium, s.high].map(Number).sort((a, b) => a - b);
    return { ...iv, effect: { low, medium, high } };
  });
}
