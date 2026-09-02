import { getScenarioTool, listInterventionsTool, runSimulationTool } from "./tools";

let registered = false;

/**
 * Attempts to register all WebMCP tools with document.modelContext.
 * Dynamically imports the polyfill so the API is available in any browser.
 * Returns a promise that resolves to true if registration succeeded.
 * Safe to call in any environment (SSR, non-WebMCP browsers).
 */
export async function registerWebMCPTools(): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }

  // Polyfill document.modelContext when the native API is absent
  try {
    const { initializeWebMCPPolyfill } = await import("@mcp-b/webmcp-polyfill");
    initializeWebMCPPolyfill();
  } catch {
    // polyfill may fail to load or throw; continue gracefully
  }

  if (!document.modelContext) {
    return false;
  }

  if (!registered) {
    document.modelContext.registerTool(getScenarioTool);
    document.modelContext.registerTool(listInterventionsTool);
    document.modelContext.registerTool(runSimulationTool);
    registered = true;
  }
  return true;
}
