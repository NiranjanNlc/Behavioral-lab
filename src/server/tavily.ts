import { cleanTitle } from "@/simulation/format";
import { cached } from "./cache";
import { requireEnv } from "./config";

export interface EvidenceSnippet {
  title: string;
  url: string;
  content: string;
}

async function search(query: string): Promise<EvidenceSnippet[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("TAVILY_API_KEY")}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 6,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as {
    results?: { title: string; url: string; content: string }[];
  };
  return (data.results ?? []).map(({ title, url, content }) => ({ title: cleanTitle(title, url), url, content }));
}

/** Searches for behavioral-science evidence relevant to a policy goal, de-duplicated by URL. */
async function discover(goal: string, target?: string): Promise<EvidenceSnippet[]> {
  const subject = target ? `${goal} among ${target}` : goal;
  const queries = [
    `behavioral nudge randomized controlled trial effect size ${subject}`,
    `behavioural intervention policy experiment evidence ${subject} reminders defaults social norms`,
    `baseline rate current level of ${subject}`,
  ];
  const batches = await Promise.all(queries.map(search));
  const seen = new Set<string>();
  return batches.flat().filter((r) => !seen.has(r.url) && seen.add(r.url));
}

/** Cached wrapper: the same goal and target reuse the earlier Tavily results instead of searching again. */
export async function discoverEvidence(goal: string, target?: string, refresh = false) {
  return cached("evidence", { goal, target }, () => discover(goal, target), { refresh });
}
