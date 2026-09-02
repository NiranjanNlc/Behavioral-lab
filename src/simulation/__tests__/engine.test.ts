import { runSimulation } from "../engine";
import { interventions } from "../data";
import { Intervention } from "../types";

function findIntervention(name: string): Intervention {
  return interventions.find((i) => i.name === name)!;
}

describe("runSimulation", () => {
  it("Default: 42 + 7 = 49", () => {
    const result = runSimulation(42, findIntervention("Default"));
    expect(result.predictedRate).toBe(49);
    expect(result.absoluteChange).toBe(7);
  });

  it("Reminder: 42 + 4 = 46", () => {
    const result = runSimulation(42, findIntervention("Reminder"));
    expect(result.predictedRate).toBe(46);
    expect(result.absoluteChange).toBe(4);
  });

  it("Social Proof: 42 + 9 = 51", () => {
    const result = runSimulation(42, findIntervention("Social Proof"));
    expect(result.predictedRate).toBe(51);
    expect(result.absoluteChange).toBe(9);
  });

  it("Financial Incentive: 42 + 15 = 57", () => {
    const result = runSimulation(42, findIntervention("Financial Incentive"));
    expect(result.predictedRate).toBe(57);
    expect(result.absoluteChange).toBe(15);
  });

  it("Loss Framing: 42 + 12 = 54", () => {
    const result = runSimulation(42, findIntervention("Loss Framing"));
    expect(result.predictedRate).toBe(54);
    expect(result.absoluteChange).toBe(12);
  });

  it("should not exceed 100", () => {
    const iv: Intervention = { id: "test", name: "Test", description: "", effect: 70, mechanism: "" };
    const result = runSimulation(95, iv);
    expect(result.predictedRate).toBe(100);
  });

  it("should not fall below 0", () => {
    const iv: Intervention = { id: "test", name: "Test", description: "", effect: -50, mechanism: "" };
    const result = runSimulation(10, iv);
    expect(result.predictedRate).toBe(0);
  });

  it("is deterministic", () => {
    const a = runSimulation(42, findIntervention("Default"));
    const b = runSimulation(42, findIntervention("Default"));
    expect(a).toEqual(b);
  });

  it("computes relative change correctly", () => {
    const result = runSimulation(42, findIntervention("Financial Incentive"));
    expect(result.relativeChange).toBeCloseTo(15 / 42);
  });
});
