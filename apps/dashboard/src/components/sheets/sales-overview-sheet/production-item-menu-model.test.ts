import { describe, expect, it } from "bun:test";

import {
	getProductionActionFeedback,
	getProductionDeleteConfirmation,
	getProductionOrderDueDate,
	hasProductionRefreshFailure,
} from "./production-item-menu-model";

describe("production bulk action model", () => {
	it("provides action-specific pending and completion feedback", () => {
		expect(getProductionActionFeedback("assign")).toEqual({
			pending: "Assigning production…",
			progress: "Assigning…",
			success: "Production assignments created",
			failure: "Could not create production assignments",
			label: "Assign All",
		});
		expect(getProductionActionFeedback("delete.assign").progress).toBe(
			"Deleting…",
		);
	});

	it("requires an explicit destructive confirmation with the affected quantity", () => {
		expect(getProductionDeleteConfirmation("delete.assign", 2)).toEqual({
			title: "Delete assignments?",
			description: "This will delete assignments for quantity 2.",
			confirmLabel: "Delete Assignments",
		});
		expect(getProductionDeleteConfirmation("assign", 2)).toBeNull();
	});

	it("turns the stored order date into the same local calendar day", () => {
		const dueDate = getProductionOrderDueDate("2026-09-04T12:00:00.000Z");

		expect(dueDate?.getFullYear()).toBe(2026);
		expect(dueDate?.getMonth()).toBe(8);
		expect(dueDate?.getDate()).toBe(4);
		expect(getProductionOrderDueDate(null)).toBeNull();
		expect(getProductionOrderDueDate("not-a-date")).toBeNull();
	});

	it("detects rejected listeners and resolved query errors during refresh", () => {
		expect(
			hasProductionRefreshFailure([
				{
					status: "fulfilled",
					value: [{ status: "fulfilled", value: { isError: false } }],
				},
			]),
		).toBe(false);
		expect(
			hasProductionRefreshFailure([
				{
					status: "fulfilled",
					value: [{ status: "rejected", reason: new Error("invalidate") }],
				},
			]),
		).toBe(true);
		expect(
			hasProductionRefreshFailure([
				{ status: "fulfilled", value: { isError: true } },
			]),
		).toBe(true);
	});
});
