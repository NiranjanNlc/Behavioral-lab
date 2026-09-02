/**
 * @jest-environment jsdom
 */
import { getScenarioTool } from "../tools";
import { scenario } from "@/simulation/data";

describe("get_scenario tool", () => {
  it("returns the scenario data as structured JSON", async () => {
    const result = await getScenarioTool.execute();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      goal: scenario.goal,
      target: scenario.target,
      baselineRate: scenario.baselineRate,
    });
  });

  it("has the correct tool name and schema", () => {
    expect(getScenarioTool.name).toBe("get_scenario");
    expect(getScenarioTool.inputSchema.type).toBe("object");
    expect(getScenarioTool.inputSchema.properties).toEqual({});
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
