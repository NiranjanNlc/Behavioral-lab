import { Direction, EffectRange } from "./types";

/** One decimal at most, no trailing ".0": 22.81 -> "22.8%", 17 -> "17%". */
export const formatPct = (n: number) => `${Number(n.toFixed(1))}%`;

export const formatPp = (n: number) => `${Number(n.toFixed(1))}pp`;

/** Signed change in the rate with a true minus sign, e.g. "−5.2pp". */
export function formatSignedPp(n: number): string {
  const v = Number(n.toFixed(1));
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}pp`;
}

/** Whole percentages, never claiming certainty: 1 -> "over 99%", 0.004 -> "under 1%". */
export function formatProbability(p: number): string {
  if (p >= 0.99) return "over 99%";
  if (p <= 0.01) return "under 1%";
  return `${Math.round(p * 100)}%`;
}

/** "−1 to −5pp, likely −3": the sign follows the goal direction, zero is unsigned. */
export function formatEffect({ low, medium, high }: EffectRange, direction: Direction): string {
  const sign = direction === "decrease" ? "−" : "+";
  const v = (n: number) => {
    const r = Number(n.toFixed(1));
    return r === 0 ? "0" : `${sign}${r}`;
  };
  return `${v(low)} to ${v(high)}pp, likely ${v(medium)}`;
}

/** Removes site-name suffixes and boilerplate prefixes from a web page title. */
export function cleanTitle(title: string, url: string): string {
  const cleaned = title
    .replace(/^\s*(view of|\(pdf\)|publication:|final\s+kp#?\d*:?)\s*/i, "")
    .replace(/\s+[|–—-]\s+(pmc|researchgate|worldbank\.org|the abdul latif jameel poverty action lab|[\w.]+\.(com|org|edu|gov|net))\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned) return cleaned;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
