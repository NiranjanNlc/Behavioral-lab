import { scenario } from "@/simulation/data";
import type { WebMCPTool } from "./types";

/**
 * WebMCP tool: get_scenario
 * Returns the currently configured behavioral scenario.
 */
export const getScenarioTool: WebMCPTool = {
  name: "get_scenario",
  description:
    "Returns the currently configured behavioral scenario, including the goal, target population, and baseline participation rate.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  execute: async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(scenario),
      },
    ],
  }),
};
