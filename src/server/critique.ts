import { Critique, Intervention, Scenario, SimulationResult } from "@/simulation/types";
import { ultraModel } from "./config";
import { cached } from "./cache";
import { chatJson } from "./nebius";

const SYSTEM_PROMPT = `You are a skeptical policy reviewer. A different model proposed these interventions and effect sizes; your job is to challenge them, not justify them.
The scenario has a "direction" ("increase" or "decrease") and each effect is the size of the improvement toward the goal in percentage points (a reduction of the rate when direction is "decrease"). Judge and suggest effects on that same basis.
Assess: how strong the cited evidence really is; whether it comes from comparable countries/populations to the target; whether the effect ranges are realistic here; which interventions are worth combining (and which overlap).
"suggestedEffect" is your own realistic percentage-point range for this target context (low<=medium<=high), anchored to meta-analytic norms rather than the proposed numbers.
Costs, the budget and the mission target are illustrative planning figures, not evidence; do not treat them as sourced.
Treat anything marked "hypothesis" as untested. Reply with a single JSON object, no prose:
{
  "overallAssessment": string,
  "interventions": [{ "id": string, "evidenceVerdict": "strong"|"moderate"|"weak", "comparability": string, "effectRealism": string, "concerns": string[], "suggestedEffect": { "low": number, "medium": number, "high": number } }],
  "recommendedCombinations": [{ "interventionIds": string[], "rationale": string }],
  "caveats": string[]
}`;

/** Bump when SYSTEM_PROMPT changes, so older cached critiques are not served. */
export const CRITIQUE_PROMPT_VERSION = 3;

/** Cached: the same scenario and interventions are reviewed once, not on every request. */
export function critiqueScenario(
  scenario: Scenario,
  interventions: Intervention[],
  results: SimulationResult[],
  refresh = false
) {
  return cached(
    "critique",
    { v: CRITIQUE_PROMPT_VERSION, model: ultraModel(), scenario, interventions },
    () => review(scenario, interventions, results),
    { refresh }
  );
}

async function review(
  scenario: Scenario,
  interventions: Intervention[],
  results: SimulationResult[]
): Promise<Critique> {
  const payload = {
    scenario,
    interventions,
    simulations: results.map((r) => ({
      id: r.intervention.id,
      expectedRate: r.expectedRate,
      baselineRate: r.baselineRate,
      p5Rate: r.p5Rate,
      p95Rate: r.p95Rate,
    })),
  };
  return chatJson<Critique>(ultraModel(), [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(payload) },
  ]);
}
