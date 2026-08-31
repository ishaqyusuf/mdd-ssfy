import { describe, expect, it } from "bun:test";

import {
	isDriverRouteStartCandidate,
	projectDriverRouteCapability,
} from "./driver-route-readiness";

const readyInput = {
	dispatchId: 4403,
	status: "packed",
	assigned: true,
	manifestItemCount: 2,
	hasBlockingPackingReport: false,
	inventoryReady: true,
	hasDestination: true,
	dueBucket: "today",
	hasOpenException: false,
};

describe("driver route readiness", () => {
	it("admits only a fully ready packed stop", () => {
		expect(projectDriverRouteCapability(readyInput)).toMatchObject({
			packingComplete: true,
			canStartTrip: true,
			nextAction: "start_trip",
			blockers: [],
			needsAttention: false,
		});
	});

	it("keeps packed inventory and review blockers out of Ready", () => {
		expect(
			projectDriverRouteCapability({
				...readyInput,
				hasBlockingPackingReport: true,
				inventoryReady: false,
			}),
		).toMatchObject({
			canStartTrip: false,
			blockers: ["PACKING_REVIEW_PENDING", "INVENTORY_REVIEW_REQUIRED"],
			blockerLabel: "Packing review pending",
			needsAttention: true,
		});
	});

	it("requires the API-projected destination check to pass", () => {
		const capability = projectDriverRouteCapability({
			...readyInput,
			hasDestination: false,
		});
		expect(capability).toMatchObject({
			canStartTrip: false,
			blockers: ["DESTINATION_REQUIRED"],
		});
		expect(isDriverRouteStartCandidate(capability)).toBe(true);
	});

	it("does not admit other blockers into address preflight", () => {
		const capability = projectDriverRouteCapability({
			...readyInput,
			hasDestination: false,
			inventoryReady: false,
		});
		expect(isDriverRouteStartCandidate(capability)).toBe(false);
	});

	it("routes active and terminal stops to their existing workflows", () => {
		expect(
			projectDriverRouteCapability({
				...readyInput,
				status: "in progress",
			}),
		).toMatchObject({ nextAction: "complete_proof", canStartTrip: false });
		expect(
			projectDriverRouteCapability({ ...readyInput, status: "completed" }),
		).toMatchObject({ nextAction: "completed", canStartTrip: false });
	});
});
