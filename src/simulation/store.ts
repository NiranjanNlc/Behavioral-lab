import { defaultInterventions, defaultScenario } from "./data";
import { Critique, Intervention, Scenario } from "./types";

export interface LabState {
  scenario: Scenario;
  interventions: Intervention[];
  /** Reviewer's critique of the current scenario, once requested. */
  critique: Critique | null;
  /** True when the active scenario was served from the server cache (no upstream API calls). */
  fromCache: boolean;
}

let state: LabState = { scenario: defaultScenario, interventions: defaultInterventions, critique: null, fromCache: false };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Shared client-side state so the UI and the WebMCP tools always see the same scenario. */
export const getLabState = (): LabState => state;

/** Replaces the scenario; any previous critique no longer applies and is cleared. */
export function setLabState(next: { scenario: Scenario; interventions: Intervention[]; fromCache?: boolean }): void {
  state = { scenario: next.scenario, interventions: next.interventions, critique: null, fromCache: next.fromCache ?? false };
  emit();
}

export function setCritique(critique: Critique | null): void {
  state = { ...state, critique };
  emit();
}

export function subscribeLabState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
