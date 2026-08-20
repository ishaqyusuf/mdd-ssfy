import { describe, expect, it } from "bun:test";
import {
	salesProductionCalendarQuerySchema,
	salesProductionQueryParamsSchema,
} from "./schema";

import { resolveSalesProductionWorkspaceQuery } from "./production-workspace-query";

describe("sales production workspace query", () => {
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
				production: "completed",
			},
		});
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
				production: "completed",
				material: "available",
				productionSort: "oldest",
			},
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
			list: { production: "completed" },
		});
		expect(resolveSalesProductionWorkspaceQuery({ show: "past-due" })).toEqual({
			tab: "queue",
			view: "table",
			list: { production: "pending", show: "past-due" },
		});
		expect(
			resolveSalesProductionWorkspaceQuery({ label: "due-today" }),
		).toEqual({
			tab: "queue",
			view: "table",
			list: { production: "pending", show: "due-today" },
		});
		expect(
			resolveSalesProductionWorkspaceQuery({ date: "2026-08-20" }),
		).toEqual({
			tab: "queue",
			view: "calendar",
			list: {
				production: "pending",
				productionDueDate: "2026-08-20",
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
			list: { production: "pending", show: "due-today" },
		});
		expect(
			resolveSalesProductionWorkspaceQuery({
				tab: "queue",
				due: "overdue",
			}),
		).toEqual({
			tab: "queue",
			view: "table",
			list: { production: "pending", show: "past-due" },
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
			list: { production: "pending" },
		});
		expect(resolveSalesProductionWorkspaceQuery({ tab: "calendar" })).toEqual({
			tab: "queue",
			view: "calendar",
			list: { production: "pending" },
		});
	});
});
