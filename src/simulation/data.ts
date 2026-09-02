import { Intervention, Scenario } from "./types";

export const scenario: Scenario = {
  goal: "Increase recycling participation",
  target: "Urban households",
  baselineRate: 42,
};

export const interventions: Intervention[] = [
  {
    id: "default",
    name: "Default",
    description: "Making recycling the default option for households.",
    effect: 7,
    mechanism:
      "Making recycling the default reduces friction and makes the desired behavior easier to choose.",
  },
  {
    id: "reminder",
    name: "Reminder",
    description: "Sending timely reminders about recycling schedules.",
    effect: 4,
    mechanism:
      "A timely reminder increases the likelihood that people remember to perform the desired behavior.",
  },
  {
    id: "social-proof",
    name: "Social Proof",
    description: "Showing neighborhood recycling participation rates.",
    effect: 9,
    mechanism:
      "Showing that many peers participate can increase perceived social norms around the behavior.",
  },
  {
    id: "financial-incentive",
    name: "Financial Incentive",
    description: "Providing a financial reward for recycling participation.",
    effect: 15,
    mechanism:
      "A financial reward increases the immediate perceived benefit of participating.",
  },
  {
    id: "loss-framing",
    name: "Loss Framing",
    description: "Framing non-recycling as a loss rather than recycling as a gain.",
    effect: 12,
    mechanism:
      "Framing non-participation as a potential loss can increase motivation through loss sensitivity.",
  },
];
