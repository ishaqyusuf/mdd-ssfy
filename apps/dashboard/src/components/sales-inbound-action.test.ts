import { describe, expect, test } from "bun:test";
import {
	getSalesInboundActionIntent,
	resolveSalesInboundColumnState,
} from "./sales-inbound-status-badge";

describe("sales inbound action intent", () => {
	test("opens the create-inbound workbench when no inventory shipment exists", () => {
		expect(getSalesInboundActionIntent(null)).toEqual({
			inboundId: null,
			openCreate: true,
			segment: "stock",
		});
	});

	test("opens the linked inbound when exactly one shipment exists", () => {
		expect(
			getSalesInboundActionIntent({
				hasInventoryInbound: true,
				linkedInbounds: [{ id: 70, status: "pending" }],
			}),
		).toEqual({
			inboundId: 70,
			openCreate: false,
			segment: "inbounds",
		});
	});

	test("opens the inbound list without guessing when several shipments exist", () => {
		expect(
			getSalesInboundActionIntent({
				hasInventoryInbound: true,
				linkedInbounds: [
					{ id: 70, status: "pending" },
					{ id: 71, status: "in_progress" },
				],
			}),
		).toEqual({
			inboundId: null,
			openCreate: false,
			segment: "inbounds",
		});
	});

	test("shows a newly linked inventory inbound before stale projection status", () => {
		expect(
			resolveSalesInboundColumnState({
				inventoryApplicabilityState: "not_synced",
				ownership: {
					hasInventoryInbound: true,
					linkedInbounds: [{ id: 72, status: "pending" }],
				},
			}),
		).toBe("inventory_inbound");
	});
});
