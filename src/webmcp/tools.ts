import { scenario } from "@/simulation/data";

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
