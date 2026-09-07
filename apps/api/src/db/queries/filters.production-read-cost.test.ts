import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { getSalesProductionFilters } from "./filters";

const cacheEnvKeys = ["REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
let savedEnv: Array<string | undefined>;
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;

beforeEach(() => {
  savedEnv = cacheEnvKeys.map((key) => process.env[key]);
  process.env.REDIS_URL = "";
  process.env.UPSTASH_REDIS_REST_URL = "https://cache.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
  // Stub only the external cache transport; run the real filter/cache loaders.
  const cacheFetch = Object.assign(async (input: Parameters<typeof fetch>[0]) => {
    expect(String(input)).toBe("https://cache.example.test");
    return Response.json({ result: "[]" });
  }, { preconnect: globalThis.fetch.preconnect });
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(cacheFetch);
});

afterEach(() => {
  fetchSpy.mockRestore();
  cacheEnvKeys.forEach((key, index) => {
    const value = savedEnv[index];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

describe("Production filter read cost", () => {
  it("propagates a failed worker read instead of returning incomplete filters", async () => {
    const failure = new Error("worker read unavailable");
    await expect(getSalesProductionFilters({
      db: {
        salesOrders: { findMany: async () => [] },
        users: { findMany: async () => { throw failure; } },
      },
    } as unknown as TRPCContext)).rejects.toBe(failure);
  });

  it("does not scan Sales orders to build high-cardinality Production inputs", async () => {
    const filters = await getSalesProductionFilters({
      db: {
        salesOrders: {
          findMany: async () => {
            throw new Error("Production filters must not scan Sales orders");
          },
        },
        users: { findMany: async () => [] },
      },
    } as unknown as TRPCContext);

    for (const key of ["q", "customer.name", "phone", "po", "sales.rep", "salesNo", "item"]) {
      expect(filters.find((filter) => filter.value === key)).toMatchObject({
        value: key,
        type: "input",
      });
    }
  });

  it("returns the existing filter values without employee-management reads or writes", async () => {
    const caller = {
      db: {
        salesOrders: {
          findMany: async () => {
            throw new Error("Production filters must not scan Sales orders");
          },
        },
        users: { findMany: async (query: unknown) => {
          expect(query).toEqual({
            where: { AND: [{ accessRevokedAt: null }, { roles: { some: { role: { name: "Production" } } } }], deletedAt: null },
            skip: 0, take: 20, orderBy: { name: "asc" },
            select: { id: true, name: true },
          });
          return [{ id: 11, name: "Example Worker" }];
        } },
        permissions: {
          findMany: async () => [],
          createMany: async () => { throw new Error("Production filters must not create employee permissions"); },
        },
      },
    } as unknown as TRPCContext;

    const filters = await getSalesProductionFilters(caller);
    const options = (key: string) => filters.find((filter) => filter.value === key)?.options;
    expect(options("assignedToId")).toEqual([{ label: "Example Worker", value: "11" }]);
    for (const key of ["q", "customer.name", "phone", "po", "sales.rep", "salesNo", "item"]) {
      expect(filters.find((filter) => filter.value === key)).toMatchObject({
        value: key,
        type: "input",
      });
      expect(options(key)).toBeUndefined();
    }
    expect(options("invoice")?.map((option) => option.value)).toEqual(["paid", "pending"]);
  });
});
