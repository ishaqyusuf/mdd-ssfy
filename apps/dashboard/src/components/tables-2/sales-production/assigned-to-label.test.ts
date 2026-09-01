import { describe, expect, test } from "bun:test";

import { getSalesProductionAssignedToLabel } from "./assigned-to-label";

describe("Sales Production assigned-to label", () => {
	test("keeps the worker name when the order is staffed", () => {
		expect(
			getSalesProductionAssignedToLabel({
				assignedTo: "Izri",
				totalAssigned: 4,
			}),
		).toBe("Izri");
	});

	test("distinguishes workerless assignment quantity from no assignment", () => {
		expect(
			getSalesProductionAssignedToLabel({
				assignedTo: null,
				totalAssigned: 4,
			}),
		).toBe("Worker not assigned");
		expect(
			getSalesProductionAssignedToLabel({
				assignedTo: null,
				totalAssigned: 0,
			}),
		).toBe("Unassigned");
	});
});
