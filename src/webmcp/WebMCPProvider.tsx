"use client";

import { useEffect, useState } from "react";
import { registerWebMCPTools } from "./register";

type WebMCPStatus = "pending" | "active" | "unavailable";

/**
 * Client component that registers WebMCP tools once on mount.
 * Renders a minimal dev indicator showing WebMCP status.
 */
export function WebMCPProvider() {
  const [status, setStatus] = useState<WebMCPStatus>("pending");

  useEffect(() => {
    let cancelled = false;
    registerWebMCPTools().then((ok) => {
      if (!cancelled) setStatus(ok ? "active" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || status === "pending") {
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
