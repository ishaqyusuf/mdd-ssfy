import { describe, expect, test } from "bun:test";
import {
	type DriverStop,
	buildDriverStopSections,
	getDriverManifestInput,
	getDriverPrimaryAction,
	getDriverStopAction,
	getDriverStopLabel,
} from "./model";

describe("driver dashboard model", () => {
	test("maps URL views to the protected driver manifest filters", () => {
		expect(getDriverManifestInput({ view: "today" }).dueBuckets).toEqual([
			"overdue",
			"today",
		]);
		expect(getDriverManifestInput({ view: "exceptions" }).risks).toEqual([
			"open_exception",
		]);
		expect(getDriverManifestInput({ view: "completed" }).statuses).toEqual([
			"completed",
		]);
	});

	test("groups route work by canonical due bucket", () => {
		const stops = [
			{ id: 1, dueBucket: "today" },
			{ id: 2, dueBucket: "overdue" },
			{ id: 3, dueBucket: "tomorrow" },
			{ id: 4, dueBucket: "unscheduled" },
		] as const;
		expect(
			buildDriverStopSections(stops).map((section) => section.title),
		).toEqual(["Overdue", "Due today", "Upcoming", "Needs scheduling"]);
	});

	test("shows the next workflow action instead of offering duplicate packing", () => {
		expect(
			getDriverPrimaryAction({
				packed: 4,
				total: 7,
				stage: "queue",
				canEditPacking: true,
				canStartTrip: false,
				canComplete: false,
				readinessState: "inventory review",
			}),
		).toEqual({ kind: "pack", label: "Pack items" });
		expect(
			getDriverPrimaryAction({
				packed: 7,
				total: 7,
				stage: "queue",
				canEditPacking: true,
				canStartTrip: false,
				canComplete: false,
				startTripBlockers: ["TRIP_NOT_READY", "DISPATCH_NOT_READY"],
				readinessState: "inventory review",
			}),
		).toEqual({ kind: "blocked", label: "Inventory review required" });
		expect(
			getDriverPrimaryAction({
				packed: 7,
				total: 7,
				stage: "packed",
				canEditPacking: true,
				canStartTrip: true,
				canComplete: false,
				readinessState: "ready",
			}),
		).toEqual({ kind: "start", label: "Start trip" });
		expect(
			getDriverPrimaryAction({
				packed: 7,
				total: 7,
				stage: "in progress",
				canEditPacking: false,
				canStartTrip: false,
				canComplete: true,
			}),
		).toEqual({ kind: "proof", label: "Complete with proof" });
		expect(
			getDriverPrimaryAction({
				packed: 7,
				total: 7,
				stage: "completed",
				canEditPacking: false,
				canStartTrip: false,
				canComplete: false,
			}),
		).toEqual({ kind: "completed", label: "Delivery completed" });
		expect(
			getDriverPrimaryAction({
				packed: 0,
				total: 0,
				stage: "queue",
				canEditPacking: true,
				canStartTrip: false,
				canComplete: false,
				readinessState: "missing items",
			}),
		).toEqual({ kind: "blocked", label: "Manifest review required" });
		expect(
			getDriverPrimaryAction({
				packed: 7,
				total: 7,
				stage: "packed",
				canEditPacking: false,
				canStartTrip: false,
				canComplete: false,
				startTripBlockers: ["PACKING_REVIEW_PENDING"],
				packingBlockers: ["PACKING_REVIEW_PENDING"],
			}),
		).toEqual({ kind: "blocked", label: "Packing review pending" });
		expect(
			getDriverPrimaryAction({
				packed: 0,
				total: 0,
				stage: "cancelled",
				canEditPacking: false,
				canStartTrip: false,
				canComplete: false,
			}),
		).toEqual({ kind: "cancelled", label: "Stop cancelled" });
	});

	test("fails closed when the route list only knows that a stop is packed", () => {
		const stop = {
			status: "queue",
			workspace: { stage: "ready_to_load", label: "Ready to load" },
		} as DriverStop;

		expect(getDriverStopAction(stop)).toBe("Review stop");
		expect(getDriverStopLabel(stop)).toBe("Packed");
	});
});
