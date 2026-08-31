import { describe, expect, it } from "bun:test";

import {
	getActiveSalesProductionStickyColumns,
	placeOrderDateAfterDueDate,
	shouldShowSalesProductionOrderDate,
} from "./column-layout";

describe("Sales Production column layout", () => {
	it("does not reserve the admin selection column in worker tables", () => {
		const stickyColumns = [
			{ id: "select", width: 50 },
			{ id: "dueDate", width: 160 },
		];

		expect(
			getActiveSalesProductionStickyColumns(stickyColumns, [
				"dueDate",
				"sales",
				"actions",
			]),
		).toEqual([{ id: "dueDate", width: 160 }]);
		expect(
			getActiveSalesProductionStickyColumns(stickyColumns, [
				"select",
				"dueDate",
				"sales",
				"actions",
			]),
		).toEqual(stickyColumns);
	});

	it("shows Order Date for Active and Unscheduled", () => {
		expect(
			shouldShowSalesProductionOrderDate({
				tab: "queue",
				view: "table",
				list: { production: "pending" },
			}),
		).toBe(true);
		expect(
			shouldShowSalesProductionOrderDate({
				tab: "queue",
				view: "table",
				list: { production: "pending", show: "unscheduled" },
			}),
		).toBe(true);
	});

	it("hides Order Date outside Active and Unscheduled", () => {
		for (const context of [
			{
				tab: "queue",
				view: "table",
				list: { show: "past-due" },
			},
			{
				tab: "queue",
				view: "table",
				list: { show: "due-today" },
			},
			{ tab: "completed", view: "table", list: {} },
			{ tab: "reviews", view: "table", list: {} },
			{ tab: "queue", view: "calendar", list: {} },
		]) {
			expect(shouldShowSalesProductionOrderDate(context)).toBe(false);
		}
	});

	it("keeps Order Date immediately after Due Date with saved column order", () => {
		const columnIds = [
			"select",
			"dueDate",
			"orderDate",
			"customer",
			"assignedTo",
			"actions",
		];

		expect(placeOrderDateAfterDueDate([], columnIds)).toEqual(columnIds);
		expect(
			placeOrderDateAfterDueDate(
				["select", "dueDate", "customer", "assignedTo", "actions"],
				columnIds,
			),
		).toEqual([
			"select",
			"dueDate",
			"orderDate",
			"customer",
			"assignedTo",
			"actions",
		]);
	});
});
