import { nebiusBaseUrl, requireEnv } from "./config";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Pulls the first JSON object out of a model reply (tolerates code fences and reasoning text). */
export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Model response contained no JSON object.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Calls an OpenAI-compatible chat completion endpoint on Nebius and parses the JSON reply. */
export async function chatJson<T>(model: string, messages: ChatMessage[]): Promise<T> {
  const res = await fetch(`${nebiusBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("NEBIUS_API_KEY")}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 4096 }),
  });
  if (!res.ok) throw new Error(`Nebius request failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Nebius returned an empty response.");
  return extractJson<T>(content);
}
