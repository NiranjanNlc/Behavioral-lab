/**
 * @jest-environment jsdom
 */
import {
  getScenarioTool,
  listInterventionsTool,
  runSimulationTool,
  compareInterventionsTool,
  explainResultTool,
  generateScenarioTool,
} from "../tools";
import { defaultInterventions, defaultScenario } from "@/simulation/data";
import { getLabState, setLabState } from "@/simulation/store";

const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

beforeEach(() => {
  setLabState({ scenario: defaultScenario, interventions: defaultInterventions });
  global.fetch = jest.fn();
});

describe("get_scenario tool", () => {
  it("returns the active scenario", async () => {
    expect(parse(await getScenarioTool.execute())).toEqual(defaultScenario);
  });

  it("has the correct tool name and schema", () => {
    expect(getScenarioTool.name).toBe("get_scenario");
    expect(getScenarioTool.inputSchema.type).toBe("object");
    expect(getScenarioTool.inputSchema.properties).toEqual({});
  });
});

describe("list_interventions tool", () => {
  it("lists effect ranges and evidence metadata", async () => {
    const list = parse(await listInterventionsTool.execute());
    expect(list).toHaveLength(5);
    expect(list[0]).toMatchObject({ id: "default", effect: { low: 3, medium: 7, high: 11 }, evidenceType: "hypothesis" });
  });
});

describe("run_simulation tool", () => {
  it("returns probabilistic outputs", async () => {
    const out = parse(await runSimulationTool.execute({ interventionId: "default" }));
    expect(out).toMatchObject({ interventionId: "default", baselineRate: 42, trials: 5000 });
    expect(out.p5Rate).toBeLessThanOrEqual(out.p95Rate);
    expect(out.disclaimer).toMatch(/not a real-world causal prediction/);
  });

  it("errors on an unknown id and lists valid ones", async () => {
    const out = await runSimulationTool.execute({ interventionId: "nope" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("social-proof");
  });

  it("works on a generated scenario with different ids", async () => {
    setLabState({
      scenario: { ...defaultScenario, baselineRate: 30, source: "generated" },
      interventions: [{ ...defaultInterventions[0], id: "sms-reminder" }],
    });
    const out = parse(await runSimulationTool.execute({ interventionId: "sms-reminder", trials: 200 }));
    expect(out).toMatchObject({ baselineRate: 30, trials: 200 });
  });
});

describe("compare_interventions tool", () => {
  it("ranks by expected rate and can include a combination", async () => {
    const out = parse(
      await compareInterventionsTool.execute({
        interventionIds: ["reminder", "financial-incentive"],
        includeCombination: true,
      })
    );
    expect(out.bestIntervention.interventionId).toBe("financial-incentive");
    expect(out.comparisons[0].expectedRate).toBeGreaterThan(out.comparisons[1].expectedRate);
    expect(out.combination.expectedRate).toBeGreaterThan(out.comparisons[0].expectedRate);
  });

  it("requires at least two ids", async () => {
    expect((await compareInterventionsTool.execute({ interventionIds: ["default"] })).isError).toBe(true);
  });
});

describe("generate_scenario tool", () => {
  it("rejects an empty goal", async () => {
    expect((await generateScenarioTool.execute({ goal: " " })).isError).toBe(true);
  });

  it("replaces the active scenario from the API response", async () => {
    const generated = {
      scenario: { ...defaultScenario, goal: "VAT filing", source: "generated" },
      interventions: [{ ...defaultInterventions[0], id: "deadline-reminder" }],
    };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ evidence: [{ title: "t", url: "https://x.org", content: "c" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => generated });
    const out = await generateScenarioTool.execute({ goal: "VAT filing" });
    expect((global.fetch as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/api/evidence", "/api/scenario"]);
    expect(out.isError).toBeUndefined();
    expect(getLabState().scenario.goal).toBe("VAT filing");
  });

  it("surfaces API errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: "TAVILY_API_KEY is not set." }) });
    const out = await generateScenarioTool.execute({ goal: "x" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("TAVILY_API_KEY");
  });
});

describe("decrease goals", () => {
  const decrease = () =>
    setLabState({
      scenario: { ...defaultScenario, goal: "Reduce teen vaping", direction: "decrease", baselineRate: 20 },
      interventions: defaultInterventions,
    });

  it("run_simulation lowers the rate and reports improvement", async () => {
    decrease();
    const out = parse(await runSimulationTool.execute({ interventionId: "default" }));
    expect(out.direction).toBe("decrease");
    expect(out.expectedRate).toBeLessThan(20);
    expect(out.expectedChange).toBeLessThan(0);
    expect(out.probabilityOfImprovement).toBeGreaterThan(0.9);
  });

  it("compare_interventions ranks the lowest expected rate first", async () => {
    decrease();
    const out = parse(
      await compareInterventionsTool.execute({ interventionIds: ["reminder", "financial-incentive"] })
    );
    expect(out.bestIntervention.interventionId).toBe("financial-incentive");
    expect(out.comparisons[0].expectedRate).toBeLessThan(out.comparisons[1].expectedRate);
  });
});

describe("explain_result tool", () => {
  it("combines the simulation with the critique for the intervention", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        overallAssessment: "Weak evidence overall.",
        interventions: [{ id: "reminder", evidenceVerdict: "weak", comparability: "c", effectRealism: "r", concerns: ["x"] }],
        recommendedCombinations: [{ interventionIds: ["reminder", "default"], rationale: "cheap" }],
        caveats: [],
      }),
    });
    const out = parse(await explainResultTool.execute({ interventionId: "reminder" }));
    expect(out.assessment.evidenceVerdict).toBe("weak");
    // The critique is cached, so a second call does not hit the API again.
    await explainResultTool.execute({ interventionId: "default" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(out.recommendedCombinations).toHaveLength(1);
    expect(out.simulatedResult.baselineRate).toBe(42);
  });

  it("errors on unknown id without calling the API", async () => {
    expect((await explainResultTool.execute({ interventionId: "nope" })).isError).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("registerWebMCPTools", () => {
  it("registers tools when document.modelContext is available", async () => {
    const mockRegister = jest.fn();
    Object.defineProperty(document, "modelContext", {
      value: { registerTool: mockRegister },
      writable: true,
      configurable: true,
    });

    const { registerWebMCPTools } = await import("../register");
    const result = await registerWebMCPTools();
    expect(result).toBe(true);
    expect(mockRegister).toHaveBeenCalledWith(getScenarioTool);
    expect(mockRegister).toHaveBeenCalledWith(generateScenarioTool);
    expect(mockRegister).toHaveBeenCalledTimes(6);

    // cleanup
    Object.defineProperty(document, "modelContext", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("returns true with polyfill when modelContext is initially absent", async () => {
    // Clear any cached module state
    jest.resetModules();

    // Remove modelContext if present
    Object.defineProperty(document, "modelContext", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Mock the polyfill to simulate what it does: set document.modelContext
    jest.mock("@mcp-b/webmcp-polyfill", () => ({
      initializeWebMCPPolyfill: () => {
        const mockRegister = jest.fn();
        Object.defineProperty(document, "modelContext", {
          value: { registerTool: mockRegister },
          writable: true,
          configurable: true,
        });
      },
    }));

    const { registerWebMCPTools } = await import("../register");
    const result = await registerWebMCPTools();
    expect(result).toBe(true);
    expect(document.modelContext).toBeDefined();

    // cleanup
    jest.restoreAllMocks();
    Object.defineProperty(document, "modelContext", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });
});
