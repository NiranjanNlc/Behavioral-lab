import {
  createRng,
  runCombinedSimulation,
  runSimulation,
  sampleTriangular,
} from "../engine";
import { defaultInterventions } from "../data";
import { Intervention } from "../types";

const make = (low: number, medium: number, high: number): Intervention => ({
  ...defaultInterventions[0],
  effect: { low, medium, high },
});

describe("sampleTriangular", () => {
  it("stays within [low, high]", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = sampleTriangular({ low: 2, medium: 5, high: 11 }, rng());
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(11);
    }
  });

  it("collapses to the mode for a degenerate range", () => {
    expect(sampleTriangular({ low: 4, medium: 4, high: 4 }, 0.3)).toBe(4);
  });
});

describe("runSimulation", () => {
  it("is deterministic for a given seed", () => {
    const iv = make(2, 7, 12);
    expect(runSimulation(42, iv, { seed: 7 })).toEqual(runSimulation(42, iv, { seed: 7 }));
  });

  it("expected rate is near baseline + mean of the triangular distribution", () => {
    // mean of triangular = (low + medium + high) / 3
    const result = runSimulation(40, make(0, 6, 12), { trials: 20000 });
    expect(result.expectedRate).toBeCloseTo(46, 0);
  });

  it("orders worst <= p5 <= median <= p95 <= best and brackets the effect range", () => {
    const r = runSimulation(40, make(2, 8, 20));
    expect(r.worstRate).toBeLessThanOrEqual(r.p5Rate);
    expect(r.p5Rate).toBeLessThanOrEqual(r.medianRate);
    expect(r.medianRate).toBeLessThanOrEqual(r.p95Rate);
    expect(r.p95Rate).toBeLessThanOrEqual(r.bestRate);
    expect(r.worstRate).toBeGreaterThanOrEqual(42);
    expect(r.bestRate).toBeLessThanOrEqual(60);
    expect(r.direction).toBe("increase");
  });

  it("reports certain improvement for a strictly positive range and none for a zero effect", () => {
    expect(runSimulation(40, make(1, 3, 5)).probabilityOfImprovement).toBe(1);
    expect(runSimulation(40, make(0, 0, 0)).probabilityOfImprovement).toBe(0);
  });

  it("can show a chance of harm when the range goes negative", () => {
    const r = runSimulation(40, make(-5, 1, 6));
    expect(r.probabilityOfImprovement).toBeGreaterThan(0);
    expect(r.probabilityOfImprovement).toBeLessThan(1);
  });

  it("clamps to [0, 100]", () => {
    expect(runSimulation(95, make(10, 20, 30)).bestRate).toBe(100);
    expect(runSimulation(2, make(-30, -20, -10)).worstRate).toBe(0);
  });

  it("computes relative change from the baseline", () => {
    const r = runSimulation(40, make(4, 4, 4));
    expect(r.expectedChange).toBe(4);
    expect(r.relativeChange).toBeCloseTo(0.1, 4);
  });

  it("handles a zero baseline", () => {
    expect(runSimulation(0, make(1, 2, 3)).relativeChange).toBe(0);
  });
});

describe("direction", () => {
  it("lowers the rate for a decrease goal and counts that as improvement", () => {
    const r = runSimulation(30, make(4, 4, 4), { direction: "decrease" });
    expect(r.direction).toBe("decrease");
    expect(r.expectedRate).toBe(26);
    expect(r.expectedChange).toBe(-4);
    expect(r.probabilityOfImprovement).toBe(1);
  });

  it("reports worst/best relative to the goal", () => {
    const r = runSimulation(30, make(2, 5, 9), { direction: "decrease" });
    expect(r.bestRate).toBeLessThan(r.worstRate);
    expect(r.bestRate).toBeGreaterThanOrEqual(21);
    expect(r.worstRate).toBeLessThanOrEqual(28);
  });

  it("clamps a decrease at 0 and combines in the same direction", () => {
    expect(runSimulation(3, make(10, 12, 15), { direction: "decrease" }).bestRate).toBe(0);
    const c = runCombinedSimulation(40, [make(4, 4, 4), make(6, 6, 6)], { direction: "decrease" });
    expect(c.expectedChange).toBeLessThan(-6);
    expect(c.expectedChange).toBeGreaterThan(-10);
  });

  it("rounds outputs to at most one decimal", () => {
    const r = runSimulation(42, make(1, 5, 11));
    for (const v of [r.expectedRate, r.p5Rate, r.p95Rate, r.worstRate, r.bestRate]) {
      expect(Math.round(v * 10) / 10).toBe(v);
    }
  });
});

describe("runCombinedSimulation", () => {
  it("beats either intervention alone but is less than their sum", () => {
    const a = make(4, 4, 4);
    const b = make(6, 6, 6);
    const combined = runCombinedSimulation(40, [a, b]);
    expect(combined.expectedChange).toBeGreaterThan(6);
    expect(combined.expectedChange).toBeLessThan(10);
  });
});
