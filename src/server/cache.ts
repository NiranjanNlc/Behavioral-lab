import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Server-side response cache for the paid calls (Tavily, Nemotron Super, Nemotron Ultra).
 *
 * - In-memory LRU, so repeats within a server process are instant.
 * - JSON files on disk, so results survive restarts and hot reloads. If the filesystem is read-only
 *   (serverless), writes are skipped silently and only the memory layer is used.
 * - In-flight de-duplication: concurrent identical requests share one upstream call.
 * - Failures are never cached.
 *
 * Set CACHE_DISABLED=1 to bypass entirely, CACHE_DIR to move the files, CACHE_TTL_HOURS to change expiry.
 */

const MAX_ENTRIES = 200;
const memory = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

const ttlMs = () => Number(process.env.CACHE_TTL_HOURS ?? 168) * 3600_000; // default: 7 days
const cacheDir = () => process.env.CACHE_DIR ?? path.join(process.cwd(), ".cache", "behaviorlab");
const disabled = () => process.env.CACHE_DISABLED === "1";

/** Stable key: lowercase, collapsed whitespace for strings; object keys sorted. */
export function cacheKey(namespace: string, input: unknown): string {
  const normalize = (v: unknown): unknown =>
    typeof v === "string"
      ? v.trim().replace(/\s+/g, " ").toLowerCase()
      : Array.isArray(v)
        ? v.map(normalize)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>)
                .filter(([, x]) => x !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, x]) => [k, normalize(x)])
            )
          : v;
  const hash = createHash("sha256").update(JSON.stringify(normalize(input))).digest("hex").slice(0, 32);
  return `${namespace}-${hash}`;
}

function remember(key: string, value: unknown, expires: number) {
  memory.delete(key);
  memory.set(key, { value, expires });
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value as string);
}

async function readDisk<T>(key: string): Promise<{ value: T; expires: number } | null> {
  try {
    const entry = JSON.parse(await readFile(path.join(cacheDir(), `${key}.json`), "utf8"));
    return typeof entry?.expires === "number" ? entry : null;
  } catch {
    return null;
  }
}

async function writeDisk(key: string, value: unknown, expires: number) {
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(path.join(cacheDir(), `${key}.json`), JSON.stringify({ expires, value }));
  } catch {
    // Read-only filesystem: the memory layer still works.
  }
}

export interface CacheResult<T> {
  value: T;
  /** True when the value came from the cache and no upstream call was made. */
  cached: boolean;
}

/**
 * Returns the cached value for (namespace, input) or computes it with `compute` and stores it.
 * Pass `refresh: true` to skip the lookup and overwrite the entry.
 */
export async function cached<T>(
  namespace: string,
  input: unknown,
  compute: () => Promise<T>,
  { refresh = false }: { refresh?: boolean } = {}
): Promise<CacheResult<T>> {
  if (disabled()) return { value: await compute(), cached: false };

  const key = cacheKey(namespace, input);
  const now = Date.now();

  if (!refresh) {
    const hit = memory.get(key);
    if (hit && hit.expires > now) {
      remember(key, hit.value, hit.expires); // refresh LRU position
      return { value: hit.value as T, cached: true };
    }
    const disk = await readDisk<T>(key);
    if (disk && disk.expires > now) {
      remember(key, disk.value, disk.expires);
      return { value: disk.value, cached: true };
    }
    const pending = inflight.get(key);
    if (pending) return { value: (await pending) as T, cached: true };
  }

  const promise = compute();
  inflight.set(key, promise);
  try {
    const value = await promise;
    const expires = now + ttlMs();
    remember(key, value, expires);
    await writeDisk(key, value, expires);
    return { value, cached: false };
  } finally {
    inflight.delete(key);
  }
}

/** Test helper: forget everything held in memory. */
export function clearMemoryCache() {
  memory.clear();
  inflight.clear();
}
