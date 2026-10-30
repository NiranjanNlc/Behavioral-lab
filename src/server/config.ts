/** Server-only configuration. Keys are read from .env.local and never sent to the browser. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to .env.local.`);
  return value;
}

export const nebiusBaseUrl = () =>
  process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";

// Verify the exact model IDs in your Nebius console and override via env if they differ.
export const superModel = () =>
  process.env.NEBIUS_SUPER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b";
export const ultraModel = () =>
  process.env.NEBIUS_ULTRA_MODEL ?? "nvidia/Nemotron-3-Ultra-550b-a55b";
