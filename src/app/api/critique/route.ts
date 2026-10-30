import { critiqueScenario } from "@/server/critique";
import { runSimulation } from "@/simulation/engine";
import { Intervention, Scenario } from "@/simulation/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const scenario = body?.scenario as Scenario | undefined;
  const interventions = body?.interventions as Intervention[] | undefined;
  if (!scenario || !Array.isArray(interventions) || interventions.length === 0) {
    return Response.json({ error: "'scenario' and a non-empty 'interventions' array are required." }, { status: 400 });
  }

  try {
    const results = interventions.map((i) => runSimulation(scenario.baselineRate, i, { direction: scenario.direction }));
    return Response.json(await critiqueScenario(scenario, interventions, results));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
