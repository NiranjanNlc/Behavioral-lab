/**
 * TypeScript declarations for the WebMCP browser API (document.modelContext).
 * These types describe the subset of the API used by BehaviorLab.
 */

export interface WebMCPToolResult {
  content: { type: "text"; text: string }[];
}

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<WebMCPToolResult>;
}

export interface ModelContext {
  registerTool: (tool: WebMCPTool) => void;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}
