/**
 * @jest-environment jsdom
 */
import { getScenarioTool } from "../tools";
import { registerWebMCPTools } from "../register";
import { scenario } from "@/simulation/data";

describe("get_scenario tool", () => {
  it("returns the scenario data as structured JSON", async () => {
    const result = await getScenarioTool.execute({});
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
  it("returns false when document.modelContext is unavailable", () => {
    expect(registerWebMCPTools()).toBe(false);
  });

  it("registers tool when document.modelContext is available", () => {
    const mockRegister = jest.fn();
    Object.defineProperty(document, "modelContext", {
      value: { registerTool: mockRegister },
      writable: true,
      configurable: true,
    });

    expect(registerWebMCPTools()).toBe(true);
    expect(mockRegister).toHaveBeenCalledWith(getScenarioTool);

    // cleanup
    Object.defineProperty(document, "modelContext", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });
});
