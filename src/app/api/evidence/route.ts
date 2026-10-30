import { discoverEvidence } from "@/server/tavily";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!goal) return Response.json({ error: "A non-empty 'goal' is required." }, { status: 400 });
  const target = typeof body.target === "string" && body.target.trim() ? body.target.trim() : undefined;

  try {
    const { value: evidence, cached } = await discoverEvidence(goal, target, body.refresh === true);
    if (evidence.length === 0) throw new Error("Tavily returned no evidence for this goal.");
    return Response.json({ evidence, cached });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 502 });
  }
}
