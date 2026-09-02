import { scenario, interventions } from "@/simulation/data";

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
