import { sanitizeMission } from "../scenario";
import { defaultInterventions } from "@/simulation/data";
import { totalCost } from "@/simulation/game";
import { Intervention } from "@/simulation/types";

const ivs = (costs: number[]): Intervention[] =>
  defaultInterventions.map((iv, i) => ({ ...iv, cost: costs[i] ?? 0 }));

describe("sanitizeMission", () => {
  it("keeps a sensible budget and currency", () => {
    const m = sanitizeMission(
      { horizonMonths: 18, budget: { amount: 30, currency: "NPR", unit: "lakh" } },
      ivs([8, 4, 6, 30, 8]),
      40,
      "increase"
    );
    expect(m.budget).toEqual({ amount: 30, currency: "NPR", unit: "lakh" });
    expect(m.horizonMonths).toBe(18);
  });

  it("never lets the budget afford every intervention", () => {
    // The model's budget of 100 would cover all five (total 56).
    const list = ivs([8, 4, 6, 30, 8]);
    const m = sanitizeMission({ budget: { amount: 100 } }, list, 40, "increase");
    expect(m.budget.amount).toBeLessThan(totalCost(list));
    expect(m.budget.amount).toBeLessThanOrEqual(totalCost(list) * 0.6);
  });

  it("always affords the two cheapest interventions together", () => {
    const list = ivs([8, 4, 6, 30, 8]);
    const m = sanitizeMission({ budget: { amount: 1 } }, list, 40, "increase");
    expect(m.budget.amount).toBeGreaterThanOrEqual(4 + 6);
  });

  it("rounds the budget to two significant figures", () => {
    const m = sanitizeMission({ budget: { amount: 29.87 } }, ivs([8, 4, 6, 30, 8]), 40, "increase");
    expect(m.budget.amount).toBe(30);
  });

  it("fills missing costs and defaults currency and horizon", () => {
    const list = ivs([10, 0, 20, 0, 0]);
    const m = sanitizeMission(undefined, list, 40, "increase");
    expect(list.every((i) => i.cost > 0)).toBe(true);
    expect(m.budget.currency).toBe("USD");
    expect(m.horizonMonths).toBe(12);
  });

  it("sets a preliminary target on the goal side of the baseline", () => {
    expect(sanitizeMission(undefined, ivs([8, 4, 6, 30, 8]), 40, "increase").targetRate).toBeGreaterThan(40);
    const down = sanitizeMission(undefined, ivs([8, 4, 6, 30, 8]), 40, "decrease").targetRate;
    expect(down).toBeLessThan(40);
    expect(down).toBeGreaterThanOrEqual(0);
  });
});

describe("local currency", () => {
  it("forces NPR in lakh for Nepal goals", () => {
    const { localCurrency } = jest.requireActual("../scenario");
    expect(localCurrency("Increase on-time VAT filing among Nepali SMEs")).toMatchObject({ currency: "NPR", unit: "lakh" });
    expect(localCurrency("Reduce teen vaping", "students in Kathmandu, Nepal")).toMatchObject({ currency: "NPR" });
    expect(localCurrency("Reduce teen vaping")).toBeNull();
  });

  it("applies the forced currency to the mission", () => {
    const m = sanitizeMission({ budget: { amount: 30, currency: "USD", unit: "thousand" } }, ivs([8, 4, 6, 30, 8]), 40, "increase", {
      currency: "NPR",
      unit: "lakh",
    });
    expect(m.budget).toMatchObject({ currency: "NPR", unit: "lakh" });
  });
});
