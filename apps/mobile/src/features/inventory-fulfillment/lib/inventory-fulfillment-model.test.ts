import { describe, expect, test } from "bun:test";
import {
	countInventoryFulfillmentFilters,
	parseInventoryFulfillmentFilters,
	serializeInventoryFulfillmentFilters,
} from "./inventory-fulfillment-filters";
import { adaptInventoryFulfillmentItem } from "./inventory-fulfillment-model";
import {
	canManageInventoryFulfillment,
	canViewInventoryFulfillment,
	getInventoryShipmentSelection,
} from "./inventory-fulfillment-policy";

const baseItem = {
	salesOrderId: 12,
	lineItemId: 34,
	orderId: "09100PC",
	customerName: "Acme",
	title: "Door line",
	uid: "line-34",
	status: "backordered",
	partialStatus: "available_now",
	deliveryMode: "pickup",
	orderStatus: "active",
	holdUntilComplete: false,
	canShipNow: true,
	orderedQty: 4,
	remainingQty: 3,
	availableToShipQty: 2,
	backorderedQty: 1,
	inboundQty: 1,
	shippedQty: 1,
	heldBackQty: 0,
	blockerComponents: [{ id: 9, componentName: "Hinge", remainingQty: 1 }],
};

describe("mobile inventory fulfillment model", () => {
	test("adapts partial shipment API rows to a stable mobile model", () => {
		const item = adaptInventoryFulfillmentItem(
			baseItem as never,
			"partial-shipments",
		);
		expect(item).toMatchObject({
			key: "12-34",
			status: "available_now",
			deliveryMode: "pickup",
			blockerLabel: "Hinge",
			blockerCount: 1,
		});
	});

	test("parses only valid route filters and serializes them compactly", () => {
		const filters = parseInventoryFulfillmentFilters(
			{
				q: " 09100 ",
				statuses: "available_now,invalid",
				deliveryModes: "pickup,freight",
				holdUntilComplete: "false",
			},
			"partial-shipments",
		);
		expect(filters).toEqual({
			q: "09100",
			statuses: ["available_now"],
			deliveryModes: ["pickup"],
			holdUntilComplete: false,
		});
		expect(countInventoryFulfillmentFilters(filters)).toBe(4);
		expect(serializeInventoryFulfillmentFilters(filters)).toEqual({
			q: "09100",
			statuses: "available_now",
			deliveryModes: "pickup",
			holdUntilComplete: "false",
		});
	});

	test("mirrors server view and operator permissions", () => {
		expect(
			canViewInventoryFulfillment({ viewInboundOrder: true } as never),
		).toBe(true);
		expect(canManageInventoryFulfillment({ viewPacking: true } as never)).toBe(
			true,
		);
		expect(canManageInventoryFulfillment({ viewOrders: true } as never)).toBe(
			false,
		);
	});

	test("allows bulk shipment only for shippable lines from one sale", () => {
		const first = adaptInventoryFulfillmentItem(
			baseItem as never,
			"partial-shipments",
		);
		const second = { ...first, key: "12-35", lineItemId: 35 };
		expect(getInventoryShipmentSelection([first, second]).valid).toBe(true);
		expect(
			getInventoryShipmentSelection([first, { ...second, salesOrderId: 13 }])
				.valid,
		).toBe(false);
		expect(
			getInventoryShipmentSelection([{ ...first, canShipNow: false }]).valid,
		).toBe(false);
	});
});
