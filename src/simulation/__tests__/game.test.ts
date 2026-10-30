import {
  bestPortfolioGain,
  betBounds,
  buildHistogram,
  calibrationScore,
  efficiency,
  formatMoney,
  goalGain,
  meetsTarget,
  rankTitle,
  successChance,
  targetFromGain,
} from "../game";
import { runCombinedSimulation } from "../engine";
import { defaultInterventions } from "../data";

describe("goal helpers", () => {
  it("measures gain toward the goal in both directions", () => {
    expect(goalGain(40, 46, "increase")).toBe(6);
    expect(goalGain(20, 14, "decrease")).toBe(6);
    expect(goalGain(20, 25, "decrease")).toBe(-5);
  });

  it("checks the target by direction", () => {
    expect(meetsTarget(50, 50, "increase")).toBe(true);
    expect(meetsTarget(49.9, 50, "increase")).toBe(false);
    expect(meetsTarget(10, 12, "decrease")).toBe(true);
    expect(meetsTarget(13, 12, "decrease")).toBe(false);
  });

  it("computes the share of draws reaching the target", () => {
    expect(successChance([40, 45, 50, 55], 50, "increase")).toBe(0.5);
    expect(successChance([], 50, "increase")).toBe(0);
  });

  it("formats money", () => {
    expect(formatMoney(50, { currency: "NPR", unit: "lakh", amount: 50 })).toBe("NPR 50 lakh");
    expect(formatMoney(7.25, { currency: "USD", unit: "", amount: 0 })).toBe("USD 7.3");
  });
});

describe("scoring", () => {
  it("rewards a bet close to the reviewed gain and punishes the optimistic claim", () => {
    expect(calibrationScore(3, 3, 10)).toBe(100);
    expect(calibrationScore(10, 3, 10)).toBe(30);
    expect(calibrationScore(0, 3, 10)).toBe(70);
    expect(calibrationScore(50, 3, 10)).toBe(0);
  });

  it("scales the error for small effects", () => {
    expect(calibrationScore(1.5, 0.5, 0.8)).toBe(0);
    expect(calibrationScore(0.6, 0.5, 0.8)).toBe(90);
  });

  it("computes efficiency and handles zero spend", () => {
    expect(efficiency(3, 6)).toBe(0.5);
    expect(efficiency(3, 0)).toBe(0);
  });

  it("maps average calibration to a rank", () => {
    expect(rankTitle(90)).toBe("Red Pen");
    expect(rankTitle(70)).toBe("Skeptic");
    expect(rankTitle(50)).toBe("Analyst");
    expect(rankTitle(10)).toBe("Optimist");
  });

  it("keeps the bet slider inside the available room", () => {
    expect(betBounds(95, "increase", 8).max).toBeLessThanOrEqual(5);
    expect(betBounds(2, "decrease", 5).max).toBeLessThanOrEqual(2);
    expect(betBounds(40, "increase", 10).max).toBe(16);
  });
});

describe("buildHistogram", () => {
  it("represents the distribution with classified dots", () => {
    const sim = runCombinedSimulation(40, defaultInterventions.slice(0, 2), { keepSamples: true });
    const h = buildHistogram(sim.samples!, { target: 48, baseline: 40, direction: "increase" });
    expect(h.dots).toHaveLength(240);
    expect(h.lo).toBeLessThanOrEqual(40);
    expect(h.hi).toBeGreaterThanOrEqual(48);
    expect(h.dots.some((d) => d.kind === "hit")).toBe(true);
    expect(h.dots.some((d) => d.kind === "short")).toBe(true);
    expect(new Set(h.dots.map((d) => d.order)).size).toBe(240);
    const share = h.dots.filter((d) => d.kind === "hit").length / 240;
    expect(Math.abs(share - successChance(sim.samples!, 48, "increase"))).toBeLessThan(0.02);
  });

  it("flags draws that moved the wrong way", () => {
    const h = buildHistogram([22, 24, 26, 30], { target: 15, baseline: 20, direction: "decrease", dots: 4 });
    expect(h.dots.map((d) => d.kind)).toEqual(["worse", "worse", "worse", "worse"]);
  });
});

describe("mission target", () => {
  it("finds the best affordable portfolio", () => {
    const cheap = bestPortfolioGain(40, "increase", defaultInterventions, 4);
    const rich = bestPortfolioGain(40, "increase", defaultInterventions, 100);
    expect(cheap).toBeGreaterThan(0);
    expect(rich).toBeGreaterThan(cheap);
    expect(bestPortfolioGain(40, "increase", defaultInterventions, 1)).toBe(0);
  });

  it("places the target a fraction of the way, on the right side, within 0-100", () => {
    expect(targetFromGain(40, "increase", 10, 0.75)).toBe(47.5);
    expect(targetFromGain(20, "decrease", 4, 0.75)).toBe(17);
    expect(targetFromGain(40, "increase", 0, 0.75)).toBe(40.5);
    expect(targetFromGain(99, "increase", 10, 0.75)).toBe(100);
    expect(targetFromGain(1, "decrease", 10, 0.75)).toBe(0);
  });
});
