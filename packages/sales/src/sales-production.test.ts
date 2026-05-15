import { describe, expect, it } from "bun:test";

import { sortProductionListByPriority } from "./sales-production";

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
