import { Citation, Direction, EvidenceStrength, Intervention, Mission, Scenario } from "@/simulation/types";
import { superModel } from "./config";
import { bestPortfolioGain, targetFromGain } from "@/simulation/game";
import { cached } from "./cache";
import { chatJson } from "./nebius";
import { discoverEvidence, EvidenceSnippet } from "./tavily";

interface RawScenario {
  mission?: {
    horizonMonths?: number;
    budget?: { amount?: number; currency?: string; unit?: string };
  };
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
  "mission": {                 // a game objective built on top of the scenario; these are illustrative planning figures, not evidence
    "horizonMonths": number,
    "budget": { "amount": number, "currency": string, "unit": string }   // ISO currency code of the target country (e.g. "NPR"); unit like "lakh", "million", "thousand" or "". Choose the unit so costs are whole numbers between 1 and 100 where possible.
  },
  "context": string,           // 2-3 sentences of context and key assumptions
  "interventions": [           // EXACTLY 5
    {
      "name": string,
      "description": string,
      "mechanism": string,     // behavioral principle
      "cost": number,          // estimated cost in the SAME currency and unit as the budget; cheap nudges (reminders) cost far less than system builds or incentives. The budget must afford two or three interventions, not all five.
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

/** Local currency to require when the goal or target is clearly in a country the sources rarely price in. */
export function localCurrency(...text: (string | undefined)[]): { currency: string; unit: string; note: string } | null {
  if (/\bnepal(i|ese)?\b/i.test(text.filter(Boolean).join(" "))) {
    return { currency: "NPR", unit: "lakh", note: "1 USD is about 133 NPR; 1 lakh = 100,000" };
  }
  return null;
}

/** Rounds to two significant figures, so budgets read as "2", "45", "1.8" rather than "1.8734". */
function roundSig(x: number, mode: "round" | "floor" | "ceil" = "round"): number {
  if (!(x > 0)) return 0;
  const step = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math[mode](x / step) * step;
}

/**
 * Repairs the model's mission so the game is always playable: costs filled in, and a budget that
 * affords two or three interventions but never all of them. The target here is only a preliminary
 * one (a share of what the proposals claim); the client replaces it once the reviewer has weighed in.
 */
export function sanitizeMission(
  raw: RawScenario["mission"],
  interventions: Intervention[],
  baselineRate: number,
  direction: Direction,
  forced?: { currency: string; unit: string } | null
): Mission {
  const known = interventions.map((i) => i.cost).filter((c) => c > 0);
  const fallbackCost = known.length ? known.reduce((s, c) => s + c, 0) / known.length : 10;
  for (const iv of interventions) if (!(iv.cost > 0)) iv.cost = Math.round(fallbackCost * 10) / 10;

  const costs = interventions.map((i) => i.cost).sort((a, b) => a - b);
  const total = costs.reduce((s, c) => s + c, 0);
  const cheapestTwo = costs.slice(0, 2).reduce((s, c) => s + c, 0);
  const lo = cheapestTwo * 1.25; // always affords the two cheapest nudges
  const hi = total * 0.6; // never affords everything
  const asked = Number(raw?.budget?.amount);
  let amount = roundSig(Math.min(hi, Math.max(lo, Number.isFinite(asked) && asked > 0 ? asked : (lo + hi) / 2)));
  if (amount > hi) amount = roundSig(hi, "floor");
  if (amount < lo) amount = roundSig(lo, "ceil");

  const budget = {
    amount,
    currency: forced?.currency ?? ((raw?.budget?.currency ?? "").toString().trim().slice(0, 8) || "USD"),
    unit: forced ? forced.unit : (raw?.budget?.unit ?? "").toString().trim().slice(0, 16),
  };
  const horizon = Number(raw?.horizonMonths);
  return {
    targetRate: targetFromGain(baselineRate, direction, bestPortfolioGain(baselineRate, direction, interventions, amount), 0.35),
    horizonMonths: Number.isFinite(horizon) && horizon > 0 ? Math.round(horizon) : 12,
    budget,
  };
}

function sanitize(
  raw: RawScenario,
  goal: string,
  evidence: EvidenceSnippet[],
  userBaseline?: number,
  forcedCurrency?: { currency: string; unit: string } | null
): {
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
      cost: Number.isFinite(Number(iv.cost)) && Number(iv.cost) > 0 ? Number(iv.cost) : 0,
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

  const direction = raw.direction === "decrease" ? "decrease" : "increase";
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
      direction,
      target: raw.target ?? "General population",
      baselineRate,
      mission: sanitizeMission(raw.mission, interventions, baselineRate, direction, forcedCurrency),
      baselineBasis: hasUserBaseline ? "user" : raw.baselineBasis === "evidence" ? "evidence" : "assumed",
      context: raw.context ?? "",
      source: "generated",
      sources: evidence.map(({ title, url }) => ({ title, url })),
    },
    interventions,
  };
}

/** Bump when SYSTEM_PROMPT or sanitizing rules change, so older cached scenarios are not served. */
export const SCENARIO_PROMPT_VERSION = 4;

/**
 * Tavily evidence discovery followed by Nemotron Super scenario generation.
 * Both steps are cached, so repeating a goal makes no upstream calls unless `refresh` is set.
 */
export async function generateScenario(
  goal: string,
  target?: string,
  baselineRate?: number,
  suppliedEvidence?: EvidenceSnippet[],
  refresh = false
) {
  let evidence = suppliedEvidence?.length ? suppliedEvidence : undefined;
  let evidenceCached = true;
  if (!evidence) {
    const found = await discoverEvidence(goal, target, refresh);
    evidence = found.value;
    evidenceCached = found.cached;
  }
  if (evidence.length === 0) throw new Error("Tavily returned no evidence for this goal.");
  const used = evidence;

  const { value, cached: scenarioCached } = await cached(
    "scenario",
    {
      v: SCENARIO_PROMPT_VERSION,
      model: superModel(),
      goal,
      target,
      baselineRate,
      sources: used.map((e) => e.url).sort(),
    },
    () => draftScenario(goal, target, baselineRate, used),
    { refresh }
  );
  return { ...value, cached: scenarioCached && evidenceCached };
}

async function draftScenario(goal: string, target: string | undefined, baselineRate: number | undefined, evidence: EvidenceSnippet[]) {
  const sources = evidence
    .map((e, i) => `[${i + 1}] ${e.title} (${e.url})\n${e.content}`)
    .join("\n\n");
  const currency = localCurrency(goal, target);
  const raw = await chatJson<RawScenario>(superModel(), [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Policy goal: ${goal}\nTarget population: ${target ?? "infer from the goal"}\n${
        baselineRate !== undefined ? `Known baseline: ${baselineRate}%\n` : ""
      }${
        currency
          ? `Required currency: express the budget and EVERY cost in ${currency.currency}, in units of ${currency.unit} (${currency.note}). Convert any US-dollar figures; do not use USD.\n`
          : "Express the budget and costs in the local currency of the target population's country (use USD only if it is in the US or unclear).\n"
      }\nEvidence sources:\n${sources}`,
    },
  ]);
  return sanitize(raw, goal, evidence, baselineRate, currency);
}
