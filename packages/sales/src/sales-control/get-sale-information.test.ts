import { describe, expect, it } from "bun:test";

import { FullSalesSelect } from "../utils/utils";
import { composeFullSalesSelect } from "./get-sale-information";

describe("composeFullSalesSelect", () => {
	it("creates request-local assignment filters without mutating the shared select", () => {
		const workerSelect = composeFullSalesSelect(77);
		const adminSelect = composeFullSalesSelect();

		expect(workerSelect.assignments.where.assignedToId).toBe(77);
		expect(adminSelect.assignments.where.assignedToId).toBeUndefined();
		expect(FullSalesSelect.assignments.where.assignedToId).toBeUndefined();
		expect(workerSelect.assignments).not.toBe(adminSelect.assignments);
		expect(workerSelect.assignments.where).not.toBe(
			adminSelect.assignments.where,
		);
	});
});
