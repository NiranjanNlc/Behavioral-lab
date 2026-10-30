import { cleanTitle, formatEffect, formatPct, formatProbability, formatSignedPp } from "../format";
import { withReviewerEffects } from "../review";
import { defaultInterventions } from "../data";
import { Critique } from "../types";

describe("formatting", () => {
  it("avoids false precision", () => {
    expect(formatPct(22.81)).toBe("22.8%");
    expect(formatPct(17)).toBe("17%");
    expect(formatSignedPp(-5.24)).toBe("−5.2pp");
    expect(formatSignedPp(2)).toBe("+2pp");
  });

  it("never claims certainty", () => {
    expect(formatProbability(1)).toBe("over 99%");
    expect(formatProbability(0.995)).toBe("over 99%");
    expect(formatProbability(0.004)).toBe("under 1%");
    expect(formatProbability(0.734)).toBe("73%");
  });

  it("formats effect ranges by direction without a signed zero", () => {
    expect(formatEffect({ low: 1, medium: 3, high: 5 }, "decrease")).toBe("−1 to −5pp, likely −3");
    expect(formatEffect({ low: 0, medium: 0.5, high: 1.5 }, "decrease")).toBe("0 to −1.5pp, likely −0.5");
    expect(formatEffect({ low: 2, medium: 4, high: 8 }, "increase")).toBe("+2 to +8pp, likely +4");
  });

  it("cleans page titles", () => {
    expect(cleanTitle("FINAL KP#2: Tax nudges in Ethiopia", "https://a.org/x")).toBe("Tax nudges in Ethiopia");
    expect(cleanTitle("(PDF) Behavioral Interventions and SME Tax Compliance", "https://a.org/x")).toBe(
      "Behavioral Interventions and SME Tax Compliance"
    );
    expect(cleanTitle("", "https://www.example.org/p")).toBe("example.org");
  });
});

describe("withReviewerEffects", () => {
  it("swaps in valid reviewer ranges and keeps the rest", () => {
    const critique = {
      interventions: [
        { id: "default", suggestedEffect: { low: 3, medium: 1, high: 2 } },
        { id: "reminder", suggestedEffect: { low: NaN, medium: 1, high: 2 } },
      ],
    } as unknown as Critique;
    const out = withReviewerEffects(defaultInterventions, critique);
    expect(out[0].effect).toEqual({ low: 1, medium: 2, high: 3 });
    expect(out[1].effect).toEqual(defaultInterventions[1].effect);
    expect(out[2]).toBe(defaultInterventions[2]);
  });
});
