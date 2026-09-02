"use client";

import { useSyncExternalStore } from "react";
import { registerWebMCPTools } from "./register";

type WebMCPStatus = "active" | "unavailable";

let cachedStatus: WebMCPStatus | null = null;

function getStatus(): WebMCPStatus {
  if (cachedStatus === null) {
    cachedStatus = registerWebMCPTools() ? "active" : "unavailable";
  }
  return cachedStatus;
}

const subscribe = () => () => {};

/**
 * Client component that registers WebMCP tools once on mount.
 * Renders a minimal dev indicator showing WebMCP status.
 */
export function WebMCPProvider() {
  const status = useSyncExternalStore(
    subscribe,
    getStatus,
    () => "unavailable" as WebMCPStatus
  );

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      data-testid="webmcp-status"
      className="fixed bottom-2 right-2 text-xs px-2 py-1 rounded opacity-60"
      style={{
        background: status === "active" ? "#22c55e" : "#6b7280",
        color: "white",
      }}
    >
      WebMCP: {status}
    </div>
  );
}
