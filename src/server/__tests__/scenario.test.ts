import { extractJson } from "../nebius";

describe("extractJson", () => {
  it("parses fenced JSON with reasoning text", () => {
    const out = extractJson<{ a: number }>('<think>hm {x}</think>\nHere:\n```json\n{"a": 1}\n```');
    expect(out).toEqual({ a: 1 });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("nothing")).toThrow();
  });
});
