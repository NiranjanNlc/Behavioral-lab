export type EvidenceType = "empirical" | "hypothesis";
export type EvidenceStrength = "strong" | "moderate" | "weak";

/** Effect on the target rate, in percentage points (low <= medium <= high). */
export interface EffectRange {
  low: number;
  medium: number;
  high: number;
}

export interface Citation {
  title: string;
  url: string;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  mechanism: string;
  effect: EffectRange;
  /** "empirical" = estimate drawn from cited research; "hypothesis" = untested idea. */
  evidenceType: EvidenceType;
  evidenceStrength: EvidenceStrength;
  assumptions: string[];
  citations: Citation[];
}

export interface Scenario {
  goal: string;
  target: string;
  baselineRate: number; // percentage
  /** "user" = supplied by the caller, "evidence" = taken from a cited source, "assumed" = model estimate. */
  baselineBasis: "user" | "evidence" | "assumed";
  context: string;
  /** Where the scenario came from: bundled demo data or AI-generated from web evidence. */
  source: "default" | "generated";
  sources: Citation[];
}

export interface SimulationResult {
  intervention: Intervention;
  baselineRate: number;
  trials: number;
  /** Predicted rates (%), clamped to [0, 100]. */
  expectedRate: number;
  medianRate: number;
  p5Rate: number;
  p95Rate: number;
  worstRate: number;
  bestRate: number;
  expectedChange: number; // percentage points
  relativeChange: number; // fraction of baseline, e.g. 0.357
  /** Fraction of trials in which the rate improved. */
  probabilityOfImprovement: number;
}

export interface CombinedSimulationResult extends Omit<SimulationResult, "intervention"> {
  interventions: Intervention[];
}

export interface SimulationOptions {
  trials?: number;
  seed?: number;
}

export interface Critique {
  overallAssessment: string;
  interventions: {
    id: string;
    evidenceVerdict: EvidenceStrength;
    comparability: string;
    effectRealism: string;
    concerns: string[];
    /** Reviewer's own realistic effect range, in percentage points. */
    suggestedEffect?: EffectRange;
  }[];
  recommendedCombinations: { interventionIds: string[]; rationale: string }[];
  caveats: string[];
}
