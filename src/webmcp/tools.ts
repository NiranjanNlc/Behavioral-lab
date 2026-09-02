import { scenario, interventions } from "@/simulation/data";
import { runSimulation } from "@/simulation/engine";

/**
 * WebMCP tool: get_scenario
 * Returns the currently configured behavioral scenario.
 */
export const getScenarioTool = {
  name: "get_scenario",
  description:
    "Returns the currently configured behavioral scenario, including the goal, target population, and baseline participation rate.",
  inputSchema: {
    type: "object",
    properties: {},
  } as const,
  execute: async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(scenario),
      },
    ],
  }),
};

/**
 * WebMCP tool: list_interventions
 * Returns the five behavioral interventions available for the current recycling scenario.
 */
export const listInterventionsTool = {
  name: "list_interventions",
  description:
    "Returns the list of available behavioral interventions for the current recycling scenario, including each intervention's id, name, and effect in percentage points.",
  inputSchema: {
    type: "object",
    properties: {},
  } as const,
  execute: async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          interventions.map(({ id, name, effect }) => ({ id, name, effect }))
        ),
      },
    ],
  }),
};

/**
 * WebMCP tool: run_simulation
 * Runs a deterministic behavioral intervention simulation for the current recycling scenario.
 */
export const runSimulationTool = {
  name: "run_simulation",
  description:
    "Runs a deterministic behavioral intervention simulation for the current recycling scenario. Accepts an intervention ID and returns the predicted recycling participation rate.",
  inputSchema: {
    type: "object",
    properties: {
      interventionId: {
        type: "string",
        description:
          "The ID of the intervention to simulate. Must be one of: default, reminder, social-proof, financial-incentive, loss-framing.",
      },
    },
    required: ["interventionId"],
  } as const,
  execute: async (params: { interventionId: string }) => {
    const intervention = interventions.find((i) => i.id === params.interventionId);
    if (!intervention) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Intervention "${params.interventionId}" is unavailable. Valid IDs: ${interventions.map((i) => i.id).join(", ")}.`,
          },
        ],
      };
    }

    const result = runSimulation(scenario.baselineRate, intervention);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            interventionId: intervention.id,
            interventionName: intervention.name,
            baselineRate: result.baselineRate,
            effect: intervention.effect,
            predictedRate: result.predictedRate,
            absoluteChange: result.absoluteChange,
            relativeChange: Math.round(result.relativeChange * 100 * 100) / 100,
            disclaimer: "Illustrative simulation \u2014 not a real-world causal prediction.",
          }),
        },
      ],
    };
  },
};
