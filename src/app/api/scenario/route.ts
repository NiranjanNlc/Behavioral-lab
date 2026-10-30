import { generateScenario } from "@/server/scenario";
import { EvidenceSnippet } from "@/server/tavily";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!goal) return Response.json({ error: "A non-empty 'goal' is required." }, { status: 400 });

  const target = typeof body.target === "string" && body.target.trim() ? body.target.trim() : undefined;
  const baselineRate =
    typeof body.baselineRate === "number" && body.baselineRate >= 0 && body.baselineRate <= 100
      ? body.baselineRate
      : undefined;

  // Evidence may be supplied by a prior /api/evidence call; otherwise it is discovered here.
  const evidence = Array.isArray(body.evidence)
    ? body.evidence
        .filter((e: unknown): e is EvidenceSnippet => {
          const x = e as Partial<EvidenceSnippet> | null;
          return !!x && typeof x.title === "string" && typeof x.url === "string" && typeof x.content === "string";
        })
        .slice(0, 25)
    : undefined;

  try {
    return Response.json(await generateScenario(goal, target, baselineRate, evidence));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
