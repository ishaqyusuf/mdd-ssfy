import { describe, expect, it } from "bun:test";

import {
  formatSalesDashboardDate,
  getRevenueOverTime,
  getSalesDashboardCreatedAtRange,
} from "./sales-dashboard";

describe("sales dashboard date filters", () => {
  it("normalizes date-only filters to inclusive calendar-day bounds", () => {
    const range = getSalesDashboardCreatedAtRange({
      from: "2026-06-09",
      to: "2026-06-09",
    });

    expect(range).toBeDefined();
    expect(formatSalesDashboardDate(range!.gte!)).toBe("2026-06-09");
    expect(formatSalesDashboardDate(range!.lte!)).toBe("2026-06-09");
    expect(range!.gte!.getHours()).toBe(0);
    expect(range!.gte!.getMinutes()).toBe(0);
    expect(range!.lte!.getHours()).toBe(23);
    expect(range!.lte!.getMinutes()).toBe(59);
  });

  it("keeps same-day revenue in the selected rawDate bucket", async () => {
    const records = [
      {
        createdAt: new Date(2026, 5, 9, 0, 0, 0, 0),
        grandTotal: 25,
      },
      {
        createdAt: new Date(2026, 5, 9, 23, 59, 59, 999),
        grandTotal: 75,
      },
      {
        createdAt: new Date(2026, 5, 10, 0, 0, 0, 0),
        grandTotal: 999,
      },
    ];

    const ctx = {
      db: {
        salesOrders: {
          findMany: async ({ where }: any) =>
            records.filter((record) => {
              const createdAt = where.createdAt;
              return (
                (!createdAt?.gte || record.createdAt >= createdAt.gte) &&
                (!createdAt?.lte || record.createdAt <= createdAt.lte)
              );
            }),
        },
      },
    };

    const data = await getRevenueOverTime(ctx as any, {
      from: "2026-06-09",
      to: "2026-06-09",
    });

    expect(data).toEqual([
      {
        date: "Jun 9",
        rawDate: "2026-06-09",
        revenue: 100,
      },
    ]);
  });
});
