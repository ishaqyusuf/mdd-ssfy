import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	getSalesInboundActionIntent,
	resolveSalesInboundColumnState,
} from "./sales-inbound-status-badge";

const salesOrderColumnsSource = readFileSync(
	new URL("./tables-2/sales-orders/columns.tsx", import.meta.url),
	"utf8",
);
const dashboardLayoutSource = readFileSync(
	new URL("../app/layout.tsx", import.meta.url),
	"utf8",
);

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

	test("explains the N/A state when it is clicked", () => {
		const notApplicableBranch = salesOrderColumnsSource.slice(
			salesOrderColumnsSource.indexOf(
				'if (columnState === "not_applicable")',
			),
			salesOrderColumnsSource.indexOf('if (columnState === "syncing")'),
		);

		expect(notApplicableBranch).toContain("<button");
		expect(notApplicableBranch).toContain("onClick");
		expect(notApplicableBranch).toContain('title: "Inbound not applicable"');
		expect(notApplicableBranch).toContain(
			"description: inventoryApplicability.description",
		);
	});

	test("mounts distinct legacy and Sonner toast providers", () => {
		expect(dashboardLayoutSource).toContain(
			'import { Toaster as MiddayToast } from "sonner";',
		);
		expect(dashboardLayoutSource).toContain(
			'import { Toaster } from "@gnd/ui/toaster";',
		);
		expect(dashboardLayoutSource).not.toContain(
			"Toaster as MiddayToast, Toaster",
		);
	});
});
