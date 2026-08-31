import { describe, expect, it } from "bun:test";

import { normalizeDispatchBacklogSort } from "./dispatch-backlog-sort";

describe("normalizeDispatchBacklogSort", () => {
	it("makes the oldest-first default explicit", () => {
		expect(normalizeDispatchBacklogSort(undefined)).toEqual(["createdAt.asc"]);
	});

	it("preserves the newest-first selection", () => {
		expect(normalizeDispatchBacklogSort(["createdAt.desc"])).toEqual([
			"createdAt.desc",
		]);
	});

	it("replaces an All-table due-date sort with the Backlog default", () => {
		expect(normalizeDispatchBacklogSort(["dueDate.desc"])).toEqual([
			"createdAt.asc",
		]);
	});
});
