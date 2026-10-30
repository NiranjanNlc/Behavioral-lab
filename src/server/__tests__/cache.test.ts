import { chmod, mkdtemp, readdir, rm } from "fs/promises";
import os from "os";
import path from "path";
import { cacheKey, cached, clearMemoryCache } from "../cache";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "bl-cache-"));
  process.env.CACHE_DIR = dir;
  delete process.env.CACHE_DISABLED;
  delete process.env.CACHE_TTL_HOURS;
  clearMemoryCache();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await chmod(dir, 0o700);
  await rm(dir, { recursive: true, force: true });
});

describe("cacheKey", () => {
  it("ignores case, spacing and key order", () => {
    expect(cacheKey("s", { goal: "Reduce  Teen Vaping", target: undefined })).toBe(
      cacheKey("s", { target: undefined, goal: " reduce teen vaping " })
    );
  });

  it("separates namespaces and different inputs", () => {
    expect(cacheKey("a", { x: 1 })).not.toBe(cacheKey("b", { x: 1 }));
    expect(cacheKey("a", { x: 1 })).not.toBe(cacheKey("a", { x: 2 }));
  });
});

describe("cached", () => {
  it("computes once, then serves from memory", async () => {
    const compute = jest.fn().mockResolvedValue({ n: 1 });
    expect(await cached("t", "k", compute)).toEqual({ value: { n: 1 }, cached: false });
    expect(await cached("t", "k", compute)).toEqual({ value: { n: 1 }, cached: true });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("serves from disk after the memory layer is cleared", async () => {
    const compute = jest.fn().mockResolvedValue("v");
    await cached("t", "k", compute);
    expect(await readdir(dir)).toHaveLength(1);
    clearMemoryCache();
    expect(await cached("t", "k", compute)).toEqual({ value: "v", cached: true });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("shares one upstream call between concurrent identical requests", async () => {
    let release!: (v: string) => void;
    const compute = jest.fn(() => new Promise<string>((r) => (release = r)));
    const a = cached("t", "k", compute);
    const b = cached("t", "k", compute);
    await new Promise((r) => setTimeout(r, 20));
    release("done");
    expect((await a).value).toBe("done");
    expect((await b).value).toBe("done");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const compute = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue("ok");
    await expect(cached("t", "k", compute)).rejects.toThrow("boom");
    expect(await cached("t", "k", compute)).toEqual({ value: "ok", cached: false });
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("expires entries after the TTL", async () => {
    const compute = jest.fn().mockResolvedValue("v");
    const now = Date.now();
    await cached("t", "k", compute);
    jest.spyOn(Date, "now").mockReturnValue(now + 169 * 3600_000);
    clearMemoryCache();
    expect((await cached("t", "k", compute)).cached).toBe(false);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("refresh skips the lookup and overwrites the entry", async () => {
    const compute = jest.fn().mockResolvedValueOnce("old").mockResolvedValue("new");
    await cached("t", "k", compute);
    expect(await cached("t", "k", compute, { refresh: true })).toEqual({ value: "new", cached: false });
    expect(await cached("t", "k", compute)).toEqual({ value: "new", cached: true });
  });

  it("is bypassed when CACHE_DISABLED=1", async () => {
    process.env.CACHE_DISABLED = "1";
    const compute = jest.fn().mockResolvedValue("v");
    await cached("t", "k", compute);
    await cached("t", "k", compute);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(await readdir(dir)).toHaveLength(0);
  });

  it("still works when the cache directory cannot be written", async () => {
    await chmod(dir, 0o500); // read-only, as on a serverless filesystem
    process.env.CACHE_DIR = path.join(dir, "sub");
    const compute = jest.fn().mockResolvedValue("v");
    expect((await cached("t", "k", compute)).cached).toBe(false);
    expect((await cached("t", "k", compute)).cached).toBe(true);
  });
});
