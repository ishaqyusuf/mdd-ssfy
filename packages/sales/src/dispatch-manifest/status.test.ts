import { describe, expect, test } from "bun:test";
import { projectDispatchLifecycle } from "./status";

describe("projectDispatchLifecycle", () => {
	test("separates unassigned and assigned queue work", () => {
		expect(projectDispatchLifecycle({ status: "queue" }).stage).toBe(
			"ready_to_assign",
		);
		expect(
			projectDispatchLifecycle({ status: "queue", driverId: 7 }).stage,
		).toBe("assigned");
	});

	test("projects packing, load, trip, and terminal stages", () => {
		expect(projectDispatchLifecycle({ status: "packing queue" }).stage).toBe(
			"packing",
		);
		expect(projectDispatchLifecycle({ status: "missing items" }).stage).toBe(
			"packing_blocked",
		);
		expect(projectDispatchLifecycle({ status: "packed" }).stage).toBe(
			"ready_to_load",
		);
		expect(projectDispatchLifecycle({ status: "in progress" }).stage).toBe(
			"in_transit",
		);
		expect(projectDispatchLifecycle({ status: "completed" }).stage).toBe(
			"fulfilled",
		);
		expect(projectDispatchLifecycle({ status: "cancelled" }).stage).toBe(
			"cancelled",
		);
	});

	test("starts only an assigned load-ready trip", () => {
		expect(
			projectDispatchLifecycle({ status: "packed", driverId: 7 }).canStartTrip,
		).toBe(true);
		expect(projectDispatchLifecycle({ status: "packed" }).canStartTrip).toBe(
			false,
		);
	});
});
