import { describe, expect, it } from "bun:test";

import {
	isProductionCompleted,
	sortProductionListByPriority,
} from "./sales-production";

describe("sales production priority sorting", () => {
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
