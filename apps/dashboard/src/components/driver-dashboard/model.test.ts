import { describe, expect, test } from "bun:test";
import {
	type DriverStop,
	buildDriverStopSections,
	formatDriverCustomerName,
	formatDriverSyncAge,
	getDriverFirstName,
	getDriverGreeting,
	getDriverManifestInput,
	getDriverPrimaryAction,
	getDriverRouteListTitle,
	getDriverStopAction,
	getDriverStopCustomer,
	getDriverStopLabel,
} from "./model";

describe("driver dashboard model", () => {
	test("personalizes the command header with the driver first name and business-time greeting", () => {
		expect(getDriverFirstName("  Miguel Ibanez ")).toBe("Miguel");
		expect(getDriverFirstName(null)).toBe("Driver");
		expect(getDriverGreeting(new Date("2026-08-30T13:00:00.000Z"))).toBe(
			"Good morning",
		);
		expect(getDriverGreeting(new Date("2026-08-30T18:00:00.000Z"))).toBe(
			"Good afternoon",
		);
		expect(getDriverGreeting(new Date("2026-08-31T01:00:00.000Z"))).toBe(
			"Good evening",
		);
	});

	test("reports truthful relative manifest sync age", () => {
		const now = new Date("2026-08-30T18:00:00.000Z").getTime();
		expect(formatDriverSyncAge(now - 20_000, now)).toBe("Synced just now");
		expect(formatDriverSyncAge(now - 60_000, now)).toBe("Synced 1 min ago");
		expect(formatDriverSyncAge(now - 3_600_000, now)).toBe("Synced 1 hr ago");
		expect(formatDriverSyncAge(now - 172_800_000, now)).toBe(
			"Synced 2 days ago",
		);
	});

	test("names the route list for each visible route tab", () => {
		expect(getDriverRouteListTitle("today")).toBe("Today’s route");
		expect(getDriverRouteListTitle("all")).toBe("All stops");
		expect(getDriverRouteListTitle("completed")).toBe("Completed stops");
	});

	test("maps URL views to the protected driver manifest filters", () => {
		expect(getDriverManifestInput({ view: "today" }).size).toBe(20);
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
		expect(getDriverManifestInput({ view: "packed" }).statuses).toEqual([
			"packed",
		]);
		expect(getDriverManifestInput({ view: "in_progress" }).statuses).toEqual([
			"in progress",
		]);
		expect(getDriverManifestInput({ view: "attention" }).tab).toBe("pending");
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

	test("normalizes customer names to uppercase across driver surfaces", () => {
		expect(formatDriverCustomerName("Acme Garage Doors")).toBe(
			"ACME GARAGE DOORS",
		);
		expect(
			getDriverStopCustomer({
				order: { shippingAddress: { name: "Jane Driver" } },
			} as DriverStop),
		).toBe("JANE DRIVER");
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

	test("uses the projected readiness state for ready and blocked stops", () => {
		expect(
			getDriverStopLabel({
				status: "packed",
				routeCapability: { canStartTrip: true },
			} as DriverStop),
		).toBe("Ready");
		expect(
			getDriverStopLabel({
				status: "packed",
				routeCapability: {
					canStartTrip: false,
					blockerLabel: "Inventory review required",
				},
			} as DriverStop),
		).toBe("Inventory review required");
	});
});
