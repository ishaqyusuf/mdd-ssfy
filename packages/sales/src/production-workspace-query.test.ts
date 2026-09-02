import { describe, expect, it } from "bun:test";
import {
	salesProductionCalendarQuerySchema,
	salesProductionQueryParamsSchema,
} from "./schema";

import { resolveSalesProductionWorkspaceQuery } from "./production-workspace-query";

describe("sales production workspace query", () => {
	it("excludes administratively completed orders from every active queue", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				due: "overdue",
			}),
		).toMatchObject({
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "past-due",
				productionSort: "dueDateAsc",
			},
		});
	});

	it("accepts only real, forward calendar date ranges", () => {
		expect(
			salesProductionCalendarQuerySchema.safeParse({
				from: "2026-08-01",
				to: "2026-08-31",
			}).success,
		).toBe(true);
		expect(
			salesProductionCalendarQuerySchema.safeParse({
				from: "2026-02-31",
				to: "2026-03-01",
			}).success,
		).toBe(false);
		expect(
			salesProductionCalendarQuerySchema.safeParse({
				from: "2026-08-31",
				to: "2026-08-01",
			}).success,
		).toBe(false);
		expect(
			salesProductionQueryParamsSchema.safeParse({ date: "not-a-date" })
				.success,
		).toBe(false);
	});

	it("maps canonical page tabs to the production list contract", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "completed",
				q: "03471",
				assignedToId: 12,
				priority: "HIGH",
			}),
		).toEqual({
			tab: "completed",
			view: "table",
			list: {
				q: "03471",
				assignedToId: 12,
				priority: "HIGH",
				"completion.production": "completed",
			},
		});
	});

	it("keeps an already-resolved Completed list query stable at the API boundary", () => {
		const first = resolveSalesProductionWorkspaceQuery({ tab: "completed" });
		const second = resolveSalesProductionWorkspaceQuery(first.list);

		expect(second).toEqual(first);
	});

	it("preserves applicable Sales Orders and invoice filters", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				"customer.name": "ACME",
				phone: "555-0100",
				po: "PO-42",
				"sales.rep": "Pablo Cruz",
				salesNo: "09439PC",
				item: "Door",
				invoice: "pending",
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				"customer.name": "ACME",
				phone: "555-0100",
				po: "PO-42",
				"sales.rep": "Pablo Cruz",
				salesNo: "09439PC",
				item: "Door",
				invoice: "pending",
				production: "pending",
				"completion.production": "pending",
			},
		});

		expect(
			salesProductionQueryParamsSchema.safeParse({ invoice: "paid" }).success,
		).toBe(true);
	});

	it("preserves production due-date and order-date calendar ranges", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				dateRange: ["2026-08-01", "2026-08-31"],
				"production.dueDate": ["2026-09-01", "2026-09-15"],
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				dateRange: ["2026-08-01", "2026-08-31"],
				"production.dueDate": ["2026-09-01", "2026-09-15"],
				production: "pending",
				"completion.production": "pending",
			},
		});

		expect(
			salesProductionQueryParamsSchema.safeParse({
				dateRange: ["2026-08-01", "2026-08-31"],
				"production.dueDate": ["2026-09-01", "2026-09-15"],
			}).success,
		).toBe(true);
	});

	it("keeps supported material and sort controls on the completed queue", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "completed",
				material: "available",
				sort: "oldest",
			}),
		).toEqual({
			tab: "completed",
			view: "table",
			list: {
				"completion.production": "completed",
				material: "available",
				productionSort: "oldest",
			},
		});
	});

	it("maps assigned-on sorting to the production list contract", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({ sort: "assigned-desc" }),
		).toMatchObject({
			list: { productionSort: "assignedAtDesc" },
		});
		expect(
			resolveSalesProductionWorkspaceQuery({ sort: "assigned-asc" }),
		).toMatchObject({
			list: { productionSort: "assignedAtAsc" },
		});
	});

	it("maps queue, due, date, material, and sort values to legacy list inputs", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				queue: "unassigned",
				due: "today",
				date: "2026-08-18",
				material: "blocked",
				sort: "due-asc",
			}),
		).toEqual({
			tab: "queue",
			view: "calendar",
			list: {
				production: "pending",
				"completion.production": "pending",
				"production.assignment": "not assigned",
				productionDueDate: "2026-08-18",
				material: "blocked",
				productionSort: "dueDateAsc",
			},
		});
	});

	it("preserves legacy production, show, label, and date deep links", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({ production: "completed" }),
		).toEqual({
			tab: "completed",
			view: "table",
			list: { "completion.production": "completed" },
		});
		expect(resolveSalesProductionWorkspaceQuery({ show: "past-due" })).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "past-due",
				productionSort: "dueDateAsc",
			},
		});
		expect(
			resolveSalesProductionWorkspaceQuery({ label: "due-today" }),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "due-today",
				productionSort: "dueDateAsc",
			},
		});
		expect(
			resolveSalesProductionWorkspaceQuery({ date: "2026-08-20" }),
		).toEqual({
			tab: "queue",
			view: "calendar",
			list: {
				production: "pending",
				"completion.production": "pending",
				productionDueDate: "2026-08-20",
			},
		});
	});

	it("removes null URL fields from the canonical list query key", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				q: null,
				assignedToId: null,
				"customer.name": null,
				production: "pending",
				show: "due-today",
				size: 20,
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "due-today",
				productionSort: "dueDateAsc",
				size: 20,
			},
		});
	});

	it("maps due-date tabs to mutually exclusive queue filters", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				due: "today",
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "due-today",
				productionSort: "dueDateAsc",
			},
		});
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				due: "overdue",
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "past-due",
				productionSort: "dueDateAsc",
			},
		});
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				due: "unscheduled",
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				show: "unscheduled",
			},
		});
	});

	it("routes awaiting review to the review tab", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({ queue: "awaiting-review" }),
		).toEqual({
			tab: "reviews",
			view: "table",
			list: { production: "pending" },
		});
	});

	it("maps ready work to assigned orders with available materials", () => {
		expect(resolveSalesProductionWorkspaceQuery({ queue: "ready" })).toEqual({
			tab: "queue",
			view: "table",
			list: {
				production: "pending",
				"completion.production": "pending",
				"production.assignment": "all assigned",
				material: "available",
			},
		});
	});

	it("keeps work state separate from table and calendar presentation", () => {
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				view: "calendar",
			}),
		).toEqual({
			tab: "queue",
			view: "calendar",
			list: {
				production: "pending",
				"completion.production": "pending",
			},
		});
		expect(resolveSalesProductionWorkspaceQuery({ tab: "calendar" })).toEqual({
			tab: "queue",
			view: "calendar",
			list: {
				production: "pending",
				"completion.production": "pending",
			},
		});
	});
});
