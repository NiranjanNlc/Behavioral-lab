import { Intervention, Scenario } from "./types";

/**
 * Offline fallback used until a scenario is generated. The effect ranges are
 * illustrative assumptions (hypotheses), not figures taken from research.
 */
export const defaultScenario: Scenario = {
  goal: "Increase recycling participation",
  direction: "increase",
  target: "Urban households",
  baselineRate: 42,
  baselineBasis: "assumed",
  context: "Illustrative demo scenario. Generate a scenario to ground it in web evidence.",
  source: "default",
  sources: [],
};

const hypothesis = {
  evidenceType: "hypothesis" as const,
  evidenceStrength: "weak" as const,
  assumptions: ["Illustrative effect range, not drawn from cited research."],
  citations: [],
};

export const defaultInterventions: Intervention[] = [
  {
    id: "default",
    name: "Default",
    description: "Making recycling the default option for households.",
    mechanism:
      "Making recycling the default reduces friction and makes the desired behavior easier to choose.",
    effect: { low: 3, medium: 7, high: 11 },
    ...hypothesis,
  },
  {
    id: "reminder",
    name: "Reminder",
    description: "Sending timely reminders about recycling schedules.",
    mechanism:
      "A timely reminder increases the likelihood that people remember to perform the desired behavior.",
    effect: { low: 1, medium: 4, high: 7 },
    ...hypothesis,
  },
  {
    id: "social-proof",
    name: "Social Proof",
    description: "Showing neighborhood recycling participation rates.",
    mechanism:
      "Showing that many peers participate can increase perceived social norms around the behavior.",
    effect: { low: 2, medium: 9, high: 14 },
    ...hypothesis,
  },
  {
    id: "financial-incentive",
    name: "Financial Incentive",
    description: "Providing a financial reward for recycling participation.",
    mechanism:
      "A financial reward increases the immediate perceived benefit of participating.",
    effect: { low: 4, medium: 15, high: 22 },
    ...hypothesis,
  },
  {
    id: "loss-framing",
    name: "Loss Framing",
    description: "Framing non-recycling as a loss rather than recycling as a gain.",
    mechanism:
      "Framing non-participation as a potential loss can increase motivation through loss sensitivity.",
    effect: { low: 0, medium: 12, high: 20 },
    ...hypothesis,
  },
];
