import { generateScenario, getOrRequestCritique } from "@/simulation/client";
import { runCombinedSimulation, runSimulation } from "@/simulation/engine";
import { getLabState } from "@/simulation/store";
import { CombinedSimulationResult, Intervention, SimulationResult } from "@/simulation/types";

const DISCLAIMER =
  "Probabilistic (Monte Carlo) simulation over estimated effect ranges — not a real-world causal prediction. Interventions marked 'hypothesis' are untested ideas, not research findings.";

const ID_HINT = "Use an id returned by list_interventions.";

interface ToolResult {
  isError?: boolean;
  content: { type: "text"; text: string }[];
}

const text = (payload: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
});

const fail = (message: string): ToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

const validIds = () => getLabState().interventions.map((i) => i.id).join(", ");

function findInterventions(ids: string[]): Intervention[] | string {
  const { interventions } = getLabState();
  const found: Intervention[] = [];
  for (const id of ids) {
    const match = interventions.find((i) => i.id === id);
    if (!match) return `Intervention "${id}" is unavailable. Valid IDs: ${validIds()}.`;
    found.push(match);
  }
  return found;
}

const trialsProperty = {
  type: "integer",
  minimum: 100,
  maximum: 100000,
  description: "Number of Monte Carlo draws (default 5000).",
} as const;

const clampTrials = (n?: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(100000, Math.max(100, Math.round(n))) : undefined;

/** WebMCP tool: get_scenario — the currently active policy scenario. */
export const getScenarioTool = {
  name: "get_scenario",
  description:
    "Returns the active policy scenario: goal, direction (increase or decrease), target population, baseline rate (%), context, and the web sources used to build it. The scenario is 'default' (illustrative demo) until generate_scenario is called.",
  inputSchema: { type: "object", properties: {} } as const,
  execute: async () => text(getLabState().scenario),
};

/** WebMCP tool: generate_scenario — define a goal, discover evidence, generate interventions. */
export const generateScenarioTool = {
  name: "generate_scenario",
  description:
    "Defines a new policy goal and builds a scenario for it: searches the web for behavioral-science evidence (Tavily), then generates five interventions with low/medium/high effect estimates, citations and assumptions (Nemotron Super). Replaces the active scenario. Takes a while to complete.",
  inputSchema: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "Behavioral or policy objective, e.g. 'Increase on-time VAT filing among Nepali SMEs'.",
      },
      target: { type: "string", description: "Optional target population." },
      baselineRate: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Optional current rate (%) of the target behavior; inferred from evidence if omitted.",
      },
    },
    required: ["goal"],
  } as const,
  execute: async (params: { goal: string; target?: string; baselineRate?: number }) => {
    if (typeof params?.goal !== "string" || !params.goal.trim()) return fail("A non-empty 'goal' is required.");
    try {
      const { scenario, interventions } = await generateScenario(
        params.goal.trim(),
        params.target,
        params.baselineRate
      );
      return text({ scenario, interventions });
    } catch (err) {
      return fail(`Scenario generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

/** WebMCP tool: list_interventions — interventions in the active scenario. */
export const listInterventionsTool = {
  name: "list_interventions",
  description:
    "Returns the five interventions in the active scenario with id, name, low/medium/high effect (percentage points of improvement toward the goal), evidence type (empirical vs hypothesis), evidence strength, and citations.",
  inputSchema: { type: "object", properties: {} } as const,
  execute: async () =>
    text(
      getLabState().interventions.map(
        ({ id, name, description, effect, evidenceType, evidenceStrength, assumptions, citations }) => ({
          id,
          name,
          description,
          effect,
          evidenceType,
          evidenceStrength,
          assumptions,
          citations,
        })
      )
    ),
};

/** WebMCP tool: run_simulation — Monte Carlo simulation of one intervention. */
export const runSimulationTool = {
  name: "run_simulation",
  description:
    "Runs a probabilistic (Monte Carlo) simulation of one intervention in the active scenario, sampling its low/medium/high effect range over thousands of Monte Carlo draws, in the direction of the goal (rate rises for an 'increase' goal, falls for a 'decrease' goal). Returns expected, median, 5th/95th percentile, worst and best-case rates (relative to the goal), and the probability of moving toward the goal.",
  inputSchema: {
    type: "object",
    properties: {
      interventionId: { type: "string", description: `The intervention to simulate. ${ID_HINT}` },
      trials: trialsProperty,
    },
    required: ["interventionId"],
  } as const,
  execute: async (params: { interventionId: string; trials?: number }) => {
    const found = findInterventions([params.interventionId]);
    if (typeof found === "string") return fail(found);
    const result: Partial<SimulationResult> = runSimulation(
      getLabState().scenario.baselineRate,
      found[0],
      { trials: clampTrials(params.trials), direction: getLabState().scenario.direction }
    );
    delete result.intervention;
    return text({
      interventionId: found[0].id,
      interventionName: found[0].name,
      evidenceType: found[0].evidenceType,
      effect: found[0].effect,
      ...result,
      disclaimer: DISCLAIMER,
    });
  },
};

/** WebMCP tool: compare_interventions — side-by-side probabilistic comparison. */
export const compareInterventionsTool = {
  name: "compare_interventions",
  description:
    "Simulates several interventions and compares them side by side, ranked best-first for the goal, with uncertainty ranges. Optionally also simulates applying them all together (with diminishing returns for overlap).",
  inputSchema: {
    type: "object",
    properties: {
      interventionIds: {
        type: "array",
        items: { type: "string" },
        description: `At least 2 intervention ids. ${ID_HINT}`,
      },
      includeCombination: {
        type: "boolean",
        description: "Also simulate all listed interventions applied together.",
      },
      trials: trialsProperty,
    },
    required: ["interventionIds"],
  } as const,
  execute: async (params: { interventionIds: string[]; includeCombination?: boolean; trials?: number }) => {
    if (!Array.isArray(params.interventionIds) || params.interventionIds.length < 2) {
      return fail("At least 2 intervention IDs are required for comparison.");
    }
    const found = findInterventions(params.interventionIds);
    if (typeof found === "string") return fail(found);

    const { baselineRate, direction } = getLabState().scenario;
    const options = { trials: clampTrials(params.trials), direction };
    const comparisons = found
      .map((iv) => {
        const r = runSimulation(baselineRate, iv, options);
        return {
          interventionId: iv.id,
          interventionName: iv.name,
          evidenceType: iv.evidenceType,
          effect: iv.effect,
          expectedRate: r.expectedRate,
          expectedChange: r.expectedChange,
          p5Rate: r.p5Rate,
          p95Rate: r.p95Rate,
          worstRate: r.worstRate,
          bestRate: r.bestRate,
          probabilityOfImprovement: r.probabilityOfImprovement,
        };
      })
      // Best first: highest rate for an "increase" goal, lowest for a "decrease" goal.
      .sort((a, b) => (direction === "decrease" ? a.expectedRate - b.expectedRate : b.expectedRate - a.expectedRate));

    let combination;
    if (params.includeCombination) {
      const c: Partial<CombinedSimulationResult> = runCombinedSimulation(baselineRate, found, options);
      delete c.interventions;
      combination = { interventionIds: found.map((i) => i.id), ...c };
    }

    return text({
      baselineRate,
      direction,
      comparisons,
      bestIntervention: comparisons[0],
      combination,
      disclaimer: DISCLAIMER,
    });
  },
};

/** WebMCP tool: explain_result — skeptical review by Nemotron Ultra. */
export const explainResultTool = {
  name: "explain_result",
  description:
    "Returns a critical assessment of an intervention's simulated result from a skeptical policy reviewer (Nemotron Ultra): evidence strength, comparability of the research to the target context, whether the effect range is realistic, concerns, and recommended combinations of nudges.",
  inputSchema: {
    type: "object",
    properties: {
      interventionId: { type: "string", description: `The intervention to evaluate. ${ID_HINT}` },
    },
    required: ["interventionId"],
  } as const,
  execute: async (params: { interventionId: string }) => {
    const found = findInterventions([params.interventionId]);
    if (typeof found === "string") return fail(found);
    const iv = found[0];
    const { scenario } = getLabState();
    const sim = runSimulation(scenario.baselineRate, iv, { direction: scenario.direction });

    try {
      const critique = await getOrRequestCritique();
      return text({
        interventionId: iv.id,
        interventionName: iv.name,
        behavioralMechanism: iv.mechanism,
        evidenceType: iv.evidenceType,
        simulatedResult: {
          direction: sim.direction,
          baselineRate: sim.baselineRate,
          expectedRate: sim.expectedRate,
          p5Rate: sim.p5Rate,
          p95Rate: sim.p95Rate,
        },
        overallAssessment: critique.overallAssessment,
        assessment: critique.interventions?.find((c) => c.id === iv.id) ?? null,
        recommendedCombinations: critique.recommendedCombinations,
        caveats: critique.caveats,
        disclaimer: DISCLAIMER,
      });
    } catch (err) {
      return fail(`Critical evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};
