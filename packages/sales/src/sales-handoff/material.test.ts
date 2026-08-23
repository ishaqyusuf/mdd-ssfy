import { describe, expect, test } from "bun:test";
import {
	type MaterialHandoffComponent,
	projectMaterialSalesHandoff,
} from "./material";

function component(
	overrides: Partial<MaterialHandoffComponent> = {},
): MaterialHandoffComponent {
	return {
		id: 10,
		required: true,
		qty: 6,
		qtyAllocated: 0,
		qtyReceived: 0,
		status: "inbound_required",
		inventoryId: 5,
		inventoryCategory: {
			productKind: "inventory",
			stockMode: "monitored",
		},
		inboundDemands: [],
		...overrides,
	};
}

function project(components: MaterialHandoffComponent[]) {
	return projectMaterialSalesHandoff({
		paymentQualified: true,
		inventoryApplicable: true,
		components,
	});
}

describe("Material Sales Handoff projection", () => {
	test("opens only for positive uncovered applicable tracked quantity", () => {
		expect(project([component()])).toMatchObject({
			actionable: true,
			uncoveredQty: 6,
			applicableComponentCount: 1,
			reason: "ACTION_REQUIRED",
		});
		for (const excluded of [
			component({ required: false }),
			component({ qty: 0 }),
			component({ status: "cancelled" }),
			component({ status: "fulfilled" }),
			component({ inventoryCategory: { stockMode: "unmonitored" } }),
			component({ inventoryCategory: { productKind: "component" } }),
		]) {
			expect(project([excluded]).actionable).toBe(false);
		}
	});

	test("subtracts allocation and receipt fulfillment before inbound coverage", () => {
		expect(
			project([component({ qty: 8, qtyAllocated: 2, qtyReceived: 3 })]),
		).toMatchObject({ actionable: true, uncoveredQty: 3 });
		expect(
			project([component({ qty: 8, qtyAllocated: 2, qtyReceived: 6 })]),
		).toMatchObject({ actionable: false, uncoveredQty: 0 });
	});

	test("active demand-owned inbound covers only its linked outstanding quantity", () => {
		const result = project([
			component({
				qty: 6,
				inboundDemands: [
					{
						id: 71,
						qty: 4,
						qtyReceived: 0,
						status: "ordered",
						inboundShipmentItemId: 91,
						inboundShipmentItem: {
							id: 91,
							inbound: { id: 101, status: "in_progress" },
						},
					},
				],
			}),
		]);
		expect(result).toMatchObject({ actionable: true, uncoveredQty: 2 });
	});

	test("supplier-less legacy inbound counts only through demand ownership", () => {
		const linkedSupplierLess = component({
			qty: 3,
			inboundDemands: [
				{
					id: 72,
					qty: 3,
					qtyReceived: 0,
					status: "ordered",
					inboundShipmentItemId: 92,
					inboundShipmentItem: {
						id: 92,
						inbound: { id: 102, status: "pending" },
					},
				},
			],
		});
		expect(project([linkedSupplierLess])).toMatchObject({
			actionable: false,
			uncoveredQty: 0,
		});
		expect(project([component({ qty: 3 })])).toMatchObject({
			actionable: true,
			uncoveredQty: 3,
		});
	});

	test("does not treat prompt-only ORDERED or terminal/deleted inbound as coverage", () => {
		const invalidDemands = [
			{
				id: 1,
				qty: 6,
				qtyReceived: 0,
				status: "ordered",
				inboundShipmentItemId: null,
			},
			{
				id: 2,
				qty: 6,
				qtyReceived: 0,
				status: "ordered",
				inboundShipmentItemId: 2,
				inboundShipmentItem: {
					id: 2,
					inbound: { id: 2, status: "completed" },
				},
			},
			{
				id: 3,
				qty: 6,
				qtyReceived: 0,
				status: "cancelled",
				inboundShipmentItemId: 3,
				inboundShipmentItem: {
					id: 3,
					inbound: { id: 3, status: "in_progress" },
				},
			},
			{
				id: 4,
				qty: 6,
				qtyReceived: 0,
				status: "ordered",
				inboundShipmentItemId: 4,
				inboundShipmentItem: {
					id: 4,
					deletedAt: "2026-08-23T00:00:00Z",
					inbound: { id: 4, status: "pending" },
				},
			},
		];
		expect(
			project([component({ inboundDemands: invalidDemands })]),
		).toMatchObject({ actionable: true, uncoveredQty: 6 });
	});

	test("never opens before payment qualification or inventory applicability", () => {
		expect(
			projectMaterialSalesHandoff({
				paymentQualified: false,
				inventoryApplicable: true,
				components: [component()],
			}),
		).toMatchObject({ actionable: false, reason: "PAYMENT_NOT_QUALIFIED" });
		expect(
			projectMaterialSalesHandoff({
				paymentQualified: true,
				inventoryApplicable: false,
				components: [component()],
			}),
		).toMatchObject({
			actionable: false,
			reason: "INVENTORY_NOT_APPLICABLE",
		});
	});

	test("evidence revision is stable across input ordering", () => {
		const left = component({ id: 1 });
		const right = component({ id: 2 });
		expect(project([left, right]).evidenceRevision).toBe(
			project([right, left]).evidenceRevision,
		);
	});
});
