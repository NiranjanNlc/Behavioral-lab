import { defaultInterventions, defaultScenario } from "./data";
import { Critique, Intervention, Scenario } from "./types";

export interface LabState {
  scenario: Scenario;
  interventions: Intervention[];
  /** Reviewer's critique of the current scenario, once requested. */
  critique: Critique | null;
}

let state: LabState = { scenario: defaultScenario, interventions: defaultInterventions, critique: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Shared client-side state so the UI and the WebMCP tools always see the same scenario. */
export const getLabState = (): LabState => state;

/** Replaces the scenario; any previous critique no longer applies and is cleared. */
export function setLabState(next: { scenario: Scenario; interventions: Intervention[] }): void {
  state = { ...next, critique: null };
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
