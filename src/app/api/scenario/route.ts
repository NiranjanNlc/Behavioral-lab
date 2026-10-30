import { generateScenario } from "@/server/scenario";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!goal) return Response.json({ error: "A non-empty 'goal' is required." }, { status: 400 });

  const target = typeof body.target === "string" && body.target.trim() ? body.target.trim() : undefined;
  const baselineRate =
    typeof body.baselineRate === "number" && body.baselineRate >= 0 && body.baselineRate <= 100
      ? body.baselineRate
      : undefined;

  try {
    return Response.json(await generateScenario(goal, target, baselineRate));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
