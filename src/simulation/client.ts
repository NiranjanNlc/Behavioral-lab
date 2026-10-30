import { Critique, Intervention, Scenario } from "./types";
import { setLabState } from "./store";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request to ${path} failed (${res.status}).`);
  return data as T;
}

/** Discovers evidence, generates a scenario server-side, and makes it the active scenario. */
export async function generateScenario(goal: string, target?: string, baselineRate?: number) {
  const next = await post<{ scenario: Scenario; interventions: Intervention[] }>("/api/scenario", {
    goal,
    target,
    baselineRate,
  });
  setLabState(next);
  return next;
}

export const requestCritique = (scenario: Scenario, interventions: Intervention[]) =>
  post<Critique>("/api/critique", { scenario, interventions });
