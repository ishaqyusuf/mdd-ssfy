import { describe, expect, it } from "bun:test";

import {
	getSalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusInfo,
} from "./order-status";

describe("sales order lifecycle status", () => {
	it("maps no production or fulfillment progress to awaiting production", () => {
		expect(getSalesOrderLifecycleStatus({})).toBe("awaiting_production");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "pending",
				fulfillmentStatus: "pending",
			}),
		).toBe("awaiting_production");
	});

	it("maps queued or assigned production to production queued", () => {
		expect(
			getSalesOrderLifecycleStatus({
				legacyProductionStatus: "Queued",
			}),
		).toBe("production_queued");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "assigned",
			}),
		).toBe("production_queued");
	});

	it("maps production progress to in production", () => {
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "in progress",
			}),
		).toBe("in_production");
		expect(
			getSalesOrderLifecycleStatus({
				legacyProductionStatus: "Started",
			}),
		).toBe("in_production");
	});

	it("maps completed or non-required production to ready to fulfill", () => {
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
			}),
		).toBe("ready_to_fulfill");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "N/A",
			}),
		).toBe("ready_to_fulfill");
		expect(
			getSalesOrderLifecycleStatus({
				hasProductionWork: false,
			}),
		).toBe("ready_to_fulfill");
	});

	it("maps fulfillment queue, packing, packed, in progress, and completed states", () => {
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
				fulfillmentStatus: "queue",
			}),
		).toBe("fulfillment_queued");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
				fulfillmentStatus: "packing queue",
			}),
		).toBe("packing");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
				fulfillmentStatus: "packed",
			}),
		).toBe("packed");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
				fulfillmentStatus: "in progress",
			}),
		).toBe("in_transit");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "completed",
				fulfillmentStatus: "completed",
			}),
		).toBe("fulfilled");
	});

	it("uses fulfillment precedence over lower production states", () => {
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "in progress",
				fulfillmentStatus: "packed",
			}),
		).toBe("packed");
		expect(
			getSalesOrderLifecycleStatus({
				productionStatus: "pending",
				fulfillmentStatus: "completed",
			}),
		).toBe("fulfilled");
	});

	it("lets delivered order status override lower states", () => {
		expect(
			getSalesOrderLifecycleStatus({
				orderStatus: "Delivered",
				productionStatus: "pending",
				fulfillmentStatus: "queue",
			}),
		).toBe("fulfilled");
	});

	it("falls back predictably for unknown state and exposes label metadata", () => {
		expect(
			getSalesOrderLifecycleStatus({
				orderStatus: "unknown",
				productionStatus: "mystery",
			}),
		).toBe("unknown");

		expect(
			getSalesOrderLifecycleStatusInfo({
				fulfillmentStatus: "completed",
			}),
		).toMatchObject({
			status: "fulfilled",
			label: "Fulfilled",
			tone: "emerald",
		});
	});
});
