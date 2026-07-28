import { describe, expect, test } from "bun:test";
import { getSalesInboundActionIntent } from "./sales-inbound-status-badge";

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
});
