import { Critique, Intervention, Scenario } from "./types";
import { bestPortfolioGain, targetFromGain } from "./game";
import { getLabState, setCritique, setLabState } from "./store";
import { withReviewerEffects } from "./review";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request to ${path} failed (${res.status}).`);
  return data as T;
}

export type GenerateProgress =
  | { stage: "searching" }
  | { stage: "drafting"; sourceCount: number }
  | { stage: "calibrating" };

/**
 * Discovers evidence, generates a scenario server-side, and makes it the active scenario.
 * Runs as two requests so the caller can report real progress between them.
 */
export async function generateScenario(
  goal: string,
  target?: string,
  baselineRate?: number,
  onProgress?: (p: GenerateProgress) => void
) {
  onProgress?.({ stage: "searching" });
  const { evidence } = await post<{ evidence: unknown[] }>("/api/evidence", { goal, target });
  onProgress?.({ stage: "drafting", sourceCount: evidence.length });
  const next = await post<{ scenario: Scenario; interventions: Intervention[] }>("/api/scenario", {
    goal,
    target,
    baselineRate,
    evidence,
  });

  // Let the reviewer pre-read the scenario so the mission target is one the evidence could support.
  // The result stays hidden in the UI until the reveal.
  onProgress?.({ stage: "calibrating" });
  let review: Critique | null = null;
  try {
    review = await post<Critique>("/api/critique", { scenario: next.scenario, interventions: next.interventions });
  } catch {
    // Without a review the preliminary target from the server is kept.
  }
  const { scenario, interventions } = next;
  const { baselineRate: baseline, direction, mission } = scenario;
  const targetRate = review
    ? targetFromGain(
        baseline,
        direction,
        bestPortfolioGain(baseline, direction, withReviewerEffects(interventions, review), mission.budget.amount),
        0.75
      )
    : mission.targetRate;
  setLabState({ scenario: { ...scenario, mission: { ...mission, targetRate } }, interventions });
  if (review) setCritique(review);
  return getLabState();
}

/** Returns the cached critique for the active scenario, requesting it from Nemotron Ultra if needed. */
export async function getOrRequestCritique(): Promise<Critique> {
  const { scenario, interventions, critique } = getLabState();
  if (critique) return critique;
  const fresh = await post<Critique>("/api/critique", { scenario, interventions });
  // Only cache if the scenario was not replaced while the request was in flight.
  if (getLabState().scenario === scenario) setCritique(fresh);
  return fresh;
}
