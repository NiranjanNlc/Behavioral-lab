import { defaultInterventions, defaultScenario } from "./data";
import { Intervention, Scenario } from "./types";

export interface LabState {
  scenario: Scenario;
  interventions: Intervention[];
}

let state: LabState = { scenario: defaultScenario, interventions: defaultInterventions };
const listeners = new Set<() => void>();

/** Shared client-side state so the UI and the WebMCP tools always see the same scenario. */
export const getLabState = (): LabState => state;

export function setLabState(next: LabState): void {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeLabState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
