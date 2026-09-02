import { getScenarioTool } from "./tools";
import type {} from "./types"; // ensure global augmentation is loaded

/**
 * Attempts to register all WebMCP tools with document.modelContext.
 * Returns true if registration succeeded, false otherwise.
 * Safe to call in any environment (SSR, non-WebMCP browsers).
 */
export function registerWebMCPTools(): boolean {
  if (typeof document === "undefined" || !document.modelContext) {
    return false;
  }

  document.modelContext.registerTool(getScenarioTool);
  return true;
}
