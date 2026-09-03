import { describe, expect, test } from "bun:test";
import { projectDispatchLifecycle } from "./status";
import { isDispatchWorkspaceSectionMatch } from "./workspace";

describe("isDispatchWorkspaceSectionMatch", () => {
	test("never admits a zero-item completed Dispatch into Fulfillment Completed", () => {
		const lifecycle = projectDispatchLifecycle({
			status: "completed",
			itemCount: 0,
			proofCompleted: true,
			inventoryConsumed: true,
		});
		expect(lifecycle.stage).toBe("packing_blocked");
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "completed",
				stage: lifecycle.stage,
			}),
		).toBe(false);
	});
	test("keeps assigned nonterminal delivery work in Active", () => {
		for (const stage of [
			"assigned",
			"packing",
			"packing_blocked",
			"ready_to_load",
			"in_transit",
		] as const) {
			expect(
				isDispatchWorkspaceSectionMatch({
					section: "active",
					stage,
					driverId: 7,
					deliveryMode: "delivery",
				}),
			).toBe(true);
		}
	});

	test("excludes unassigned and terminal deliveries from Active", () => {
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "active",
				stage: "ready_to_assign",
				driverId: null,
				deliveryMode: "delivery",
			}),
		).toBe(false);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "active",
				stage: "fulfilled",
				driverId: 7,
				deliveryMode: "delivery",
			}),
		).toBe(false);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "active",
				stage: "cancelled",
				driverId: 7,
				deliveryMode: "delivery",
			}),
		).toBe(false);
	});

	test("keeps open pickups active without requiring a driver", () => {
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "active",
				stage: "ready_to_load",
				driverId: null,
				deliveryMode: "pickup",
			}),
		).toBe(true);
	});

	test("keeps only fulfilled dispatches in Completed", () => {
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "completed",
				stage: "fulfilled",
			}),
		).toBe(true);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "completed",
				stage: "cancelled",
			}),
		).toBe(false);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "completed",
				stage: "in_transit",
			}),
		).toBe(false);
	});

	test("keeps Due Today and Past Due inside canonical Active membership", () => {
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "due-today",
				stage: "packing",
				driverId: 7,
				deliveryMode: "delivery",
				dueBucket: "today",
			}),
		).toBe(true);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "due-today",
				stage: "fulfilled",
				driverId: 7,
				deliveryMode: "delivery",
				dueBucket: "today",
			}),
		).toBe(false);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "past-due",
				stage: "in_transit",
				driverId: 7,
				deliveryMode: "delivery",
				dueBucket: "overdue",
			}),
		).toBe(true);
		expect(
			isDispatchWorkspaceSectionMatch({
				section: "past-due",
				stage: "assigned",
				driverId: null,
				deliveryMode: "delivery",
				dueBucket: "overdue",
			}),
		).toBe(false);
	});
});
