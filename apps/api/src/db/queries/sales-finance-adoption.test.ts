import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	getSalesFinanceAdoptionReadiness,
	recordSalesFinanceAdoption,
} from "./sales-finance";

describe("Sales Finance adoption evidence", () => {
	it("records Finance and legacy surfaces without storing search details", async () => {
		const creates: unknown[] = [];
		const ctx = {
			userId: 7,
			db: {
				pageView: {
					count: async () => 0,
					create: async (input: unknown) => {
						creates.push(input);
						return { id: creates.length, createdAt: new Date() };
					},
				},
			},
		} as unknown as TRPCContext;

		await recordSalesFinanceAdoption(ctx, { surface: "receivables" });
		await recordSalesFinanceAdoption(ctx, { surface: "legacy-accounting" });

		expect(creates).toEqual([
			{
				data: {
					url: "/sales-book/finance",
					group: "sales-finance:receivables",
					userId: 7,
				},
				select: { id: true, createdAt: true },
			},
			{
				data: {
					url: "/sales-book/accounting",
					group: "sales-finance:legacy-accounting",
					userId: 7,
				},
				select: { id: true, createdAt: true },
			},
		]);
	});

	it("identifies only the first recorded Finance visit for onboarding", async () => {
		let financeViews = 0;
		const ctx = {
			userId: 7,
			db: {
				pageView: {
					count: async () => financeViews,
					create: async ({ data }: { data: { url: string } }) => {
						if (data.url === "/sales-book/finance") financeViews += 1;
						return { id: financeViews, createdAt: new Date() };
					},
				},
			},
		} as unknown as TRPCContext;

		const first = await recordSalesFinanceAdoption(ctx, {
			surface: "payments",
		});
		const repeat = await recordSalesFinanceAdoption(ctx, {
			surface: "review",
		});
		const legacy = await recordSalesFinanceAdoption(ctx, {
			surface: "legacy-accounting",
		});

		expect(first.isFirstFinanceVisit).toBe(true);
		expect(repeat.isFirstFinanceVisit).toBe(false);
		expect(legacy.isFirstFinanceVisit).toBe(false);
	});

	it("reports rolling usage while keeping retirement explicitly gated", async () => {
		const ctx = {
			db: {
				pageView: {
					findMany: async () => [
						{
							url: "/sales-book/finance",
							group: "sales-finance:payments",
							userId: 7,
							createdAt: new Date("2026-07-30T12:00:00.000Z"),
						},
						{
							url: "/sales-book/finance",
							group: "sales-finance:review",
							userId: 8,
							createdAt: new Date("2026-07-30T11:00:00.000Z"),
						},
						{
							url: "/sales-book/accounting",
							group: "sales-finance:legacy-accounting",
							userId: 7,
							createdAt: new Date("2026-07-29T12:00:00.000Z"),
						},
					],
				},
			},
		} as unknown as TRPCContext;

		const result = await getSalesFinanceAdoptionReadiness(ctx);

		expect(result.finance).toMatchObject({
			views: 2,
			uniqueUsers: 2,
			surfaces: {
				payments: 1,
				review: 1,
				receivables: 0,
			},
		});
		expect(result.legacy).toMatchObject({
			views: 1,
			uniqueUsers: 1,
		});
		expect(result.gates.filter((gate) => gate.status === "ready")).toHaveLength(
			4,
		);
		expect(result.retirementEligible).toBe(false);
	});
});
