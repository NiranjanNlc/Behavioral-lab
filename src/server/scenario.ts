import { Citation, EvidenceStrength, Intervention, Scenario } from "@/simulation/types";
import { superModel } from "./config";
import { chatJson } from "./nebius";
import { discoverEvidence, EvidenceSnippet } from "./tavily";

interface RawScenario {
  direction?: string;
  target?: string;
  baselineRate?: number;
  baselineBasis?: string;
  context?: string;
  interventions?: Partial<Intervention>[];
}

const SYSTEM_PROMPT = `You are a behavioral-science analyst building a policy simulation scenario.
Use ONLY the numbered evidence sources provided. Reply with a single JSON object, no prose:
{
  "direction": "increase" | "decrease",   // does the goal RAISE the rate (e.g. filing, vaccination) or LOWER it (e.g. abuse, vaping, defaults)?
  "target": string,            // the population
  "baselineRate": number,      // current % (0-100) of the target behavior, i.e. the rate being raised or lowered; use evidence if available, otherwise a clearly reasonable estimate
  "baselineBasis": "evidence" | "assumed",   // "evidence" ONLY if a provided source reports this rate for a comparable population; otherwise "assumed"
  "context": string,           // 2-3 sentences of context and key assumptions
  "interventions": [           // EXACTLY 5
    {
      "name": string,
      "description": string,
      "mechanism": string,     // behavioral principle
      "effect": { "low": number, "medium": number, "high": number },  // size of the IMPROVEMENT toward the goal in percentage points (a reduction when direction is "decrease"), always a non-negative magnitude, low<=medium<=high
      "evidenceType": "empirical" | "hypothesis",   // "empirical" ONLY if a provided source reports a comparable effect; otherwise "hypothesis"
      "evidenceStrength": "strong" | "moderate" | "weak",
      "assumptions": string[],
      "citations": number[]    // source numbers that support this intervention; [] for hypotheses
    }
  ]
}
Effect sizes must be conservative and realistic: single nudges (reminders, messaging, simplification) in field settings usually move behavior by roughly 1-10 percentage points, rarely more than 15; only strong structural changes (defaults, mandates, automatic enrolment) or large incentives can exceed that. Do not copy an effect from a study of a different population without shrinking it. Combined or stacked nudges must not simply sum their effects. Never use a social-norm claim that would be false for the target population. Be honest about baselineBasis: most low-data contexts have no measured baseline. Keep the effect within the room available: baseline + high <= 100 for "increase", baseline - high >= 0 for "decrease".
Never invent sources or statistics. When evidence is thin, widen the effect range and mark it a hypothesis.`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const STRENGTHS: EvidenceStrength[] = ["strong", "moderate", "weak"];

function sanitize(raw: RawScenario, goal: string, evidence: EvidenceSnippet[], userBaseline?: number): {
  scenario: Scenario;
  interventions: Intervention[];
} {
  const rawInterventions = (raw.interventions ?? []).slice(0, 5);
  if (rawInterventions.length === 0) throw new Error("Model returned no interventions.");

  const interventions = rawInterventions.map((iv, idx): Intervention => {
    const nums = [iv.effect?.low, iv.effect?.medium, iv.effect?.high].map((n) => Number(n));
    const [low, medium, high] = nums.some((n) => !Number.isFinite(n)) ? [0, 0, 0] : nums.sort((a, b) => a - b);
    const citationIdx = ((iv.citations ?? []) as unknown as number[]).filter(
      (n) => Number.isInteger(n) && n >= 1 && n <= evidence.length
    );
    const citations: Citation[] = [...new Set(citationIdx)].map((n) => ({
      title: evidence[n - 1].title,
      url: evidence[n - 1].url,
    }));
    return {
      id: slug(iv.name ?? "") || `intervention-${idx + 1}`,
      name: iv.name ?? `Intervention ${idx + 1}`,
      description: iv.description ?? "",
      mechanism: iv.mechanism ?? "",
      effect: { low, medium, high },
      // An "empirical" claim without a verifiable citation is downgraded.
      evidenceType: iv.evidenceType === "empirical" && citations.length > 0 ? "empirical" : "hypothesis",
      evidenceStrength: STRENGTHS.includes(iv.evidenceStrength as EvidenceStrength)
        ? (iv.evidenceStrength as EvidenceStrength)
        : "weak",
      assumptions: Array.isArray(iv.assumptions) ? iv.assumptions.map(String) : [],
      citations,
    };
  });

  const modelBaseline = Number(raw.baselineRate);
  const hasUserBaseline = Number.isFinite(userBaseline);
  const baselineRate = hasUserBaseline
    ? (userBaseline as number)
    : Number.isFinite(modelBaseline)
      ? Math.min(100, Math.max(0, modelBaseline))
      : 50;

  return {
    scenario: {
      goal,
      direction: raw.direction === "decrease" ? "decrease" : "increase",
      target: raw.target ?? "General population",
      baselineRate,
      baselineBasis: hasUserBaseline ? "user" : raw.baselineBasis === "evidence" ? "evidence" : "assumed",
      context: raw.context ?? "",
      source: "generated",
      sources: evidence.map(({ title, url }) => ({ title, url })),
    },
    interventions,
  };
}

/** Tavily evidence discovery followed by Nemotron Super scenario generation. */
export async function generateScenario(
  goal: string,
  target?: string,
  baselineRate?: number,
  suppliedEvidence?: EvidenceSnippet[]
) {
  const evidence = suppliedEvidence?.length ? suppliedEvidence : await discoverEvidence(goal, target);
  if (evidence.length === 0) throw new Error("Tavily returned no evidence for this goal.");

  const sources = evidence
    .map((e, i) => `[${i + 1}] ${e.title} (${e.url})\n${e.content}`)
    .join("\n\n");
  const raw = await chatJson<RawScenario>(superModel(), [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Policy goal: ${goal}\nTarget population: ${target ?? "infer from the goal"}\n${
        baselineRate !== undefined ? `Known baseline: ${baselineRate}%\n` : ""
      }\nEvidence sources:\n${sources}`,
    },
  ]);
  return sanitize(raw, goal, evidence, baselineRate);
}
