import { describe, expect, it } from "bun:test";

import {
	getSalesProductions,
	isProductionCompleted,
	sortProductionListByPriority,
} from "./sales-production";

describe("sales production priority sorting", () => {
	it("keeps database pagination when a production sort is requested", async () => {
		const findManyCalls: any[] = [];
		const db = {
			salesOrders: {
				count: async () => 1000,
				findMany: async (args: any) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as any, {
			production: "pending",
			productionSort: "priority",
			size: 20,
			cursor: "40",
		} as any);

		expect(findManyCalls).toHaveLength(1);
		expect(findManyCalls[0].take).toBe(20);
		expect(findManyCalls[0].skip).toBe(40);
	});

	it("sorts production queue by priority before due date", () => {
		const sorted = sortProductionListByPriority([
			{ orderId: "NORMAL-DUE-FIRST", priority: "NORMAL", dueDate: "2026-05-14" },
			{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-13" },
			{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-16" },
			{ orderId: "HIGH", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"CRITICAL",
			"HIGH",
			"NORMAL-DUE-FIRST",
			"LOW",
		]);
	});

	it("uses due date within the same priority", () => {
		const sorted = sortProductionListByPriority([
			{ orderId: "LATER", priority: "HIGH", dueDate: "2026-05-18" },
			{ orderId: "SOONER", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual(["SOONER", "LATER"]);
	});

	it("sorts by soonest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"SOONER",
			"LATER",
			"NO-DATE",
		]);
	});

	it("sorts by latest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateDesc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"LATER",
			"SOONER",
			"NO-DATE",
		]);
	});

	it("uses priority as the tie-breaker for matching due dates", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-15" },
				{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual(["CRITICAL", "LOW"]);
	});

	it("sorts newest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
			],
			"newest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"NEWER",
			"SAME-DAY-HIGHER-ID",
			"OLDER",
		]);
	});

	it("sorts oldest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
			],
			"oldest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"OLDER",
			"SAME-DAY-HIGHER-ID",
			"NEWER",
		]);
	});
});

describe("sales production completion detection", () => {
	it("treats a fully completed production stat as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 100 },
				totalAssigned: 4,
				totalCompleted: 0,
				totalProductionQty: 4,
			}),
		).toBe(true);
	});

	it("treats fully submitted due assignments as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 2,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(true);
	});

	it("does not let partial assignment submissions count as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 4,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(false);
	});
});
