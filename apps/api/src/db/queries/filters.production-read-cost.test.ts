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

  it("can load worker options while the independent sales-options read is pending", async () => {
    let releaseSales!: (rows: []) => void;
    const pendingSales = new Promise<[]>((resolve) => { releaseSales = resolve; });
    let workerReadStarted = false;
    const response = getSalesProductionFilters({
      db: {
        salesOrders: { findMany: () => pendingSales },
        users: { findMany: async () => { workerReadStarted = true; return []; } },
      },
    } as unknown as TRPCContext);
    try {
      await Promise.resolve();
      expect(workerReadStarted).toBe(true);
    } finally {
      releaseSales([]);
      await response;
    }
  });

  it("returns the existing filter values without employee-management reads or writes", async () => {
    const caller = {
      db: {
        salesOrders: { findMany: async () => [{
          orderId: "09502PC", meta: { po: "PO-42" },
          customer: { name: "Example Customer", businessName: null, phoneNo: "123" },
          billingAddress: { phoneNo: "456" }, salesRep: { name: "Example Rep" },
        }] },
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
    expect(options("salesNo")).toEqual([{ label: "09502PC", value: "09502PC" }]);
    expect(options("customer.name")).toEqual([{ label: "Example Customer", value: "Example Customer" }]);
    expect(options("phone")).toEqual([{ label: "123", value: "123" }, { label: "456", value: "456" }]);
    expect(options("po")).toEqual([{ label: "PO-42", value: "PO-42" }]);
    expect(options("sales.rep")).toEqual([{ label: "Example Rep", value: "Example Rep" }]);
    expect(options("invoice")?.map((option) => option.value)).toEqual(["paid", "pending"]);
  });
});
