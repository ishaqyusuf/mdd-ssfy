import { describe, expect, it } from "bun:test";
import { createInitialSalesFormState } from "../initial-state";
import type { SalesFormStateRecord } from "../types";
import {
	countSalesFormDeliveryCosts,
	setSalesFormDeliveryOption,
} from "./extra-costs";

function createRecord(
	deliveryOption: "delivery" | "pickup" = "pickup",
	extraCosts: SalesFormStateRecord["extraCosts"] = [],
): SalesFormStateRecord {
	return {
		type: "order",
		salesId: 101,
		form: {
			deliveryOption,
			paymentMethod: null,
		},
		lineItems: [
			{
				uid: "line-1",
				qty: 1,
				unitPrice: 100,
				lineTotal: 100,
				taxxable: false,
				meta: {},
				formSteps: [],
			},
		],
		extraCosts,
		summary: {
			taxRate: 0,
			subTotal: 100,
			grandTotal: 100,
		},
	};
}

function createState(record: SalesFormStateRecord) {
	return {
		...createInitialSalesFormState(),
		record,
	};
}

describe("sales form fulfillment additional costs", () => {
	it("adds one editable zero-value Delivery cost on an explicit Delivery change", () => {
		const state = {
			...createState(createRecord()),
			saveStatus: "error" as const,
			lastSaveError: "Previous save failed",
		};

		const next = setSalesFormDeliveryOption(state, "delivery");

		expect(next.record?.form?.deliveryOption).toBe("delivery");
		expect(
			next.record?.extraCosts.filter((cost) => cost.type === "Delivery"),
		).toEqual([
			{
				id: null,
				label: "Delivery",
				type: "Delivery",
				amount: 0,
				taxxable: false,
			},
		]);
		expect(next.record?.summary?.delivery).toBe(0);
		expect(next.record?.summary?.grandTotal).toBe(100);
		expect(next.dirty).toBe(true);
		expect(next.saveStatus).toBe("idle");
		expect(next.lastSaveError).toBeNull();
	});

	it("preserves an existing renamed Delivery cost without adding a duplicate", () => {
		const state = createState(
			createRecord("pickup", [
				{
					id: 41,
					label: "Freight & Handling",
					type: "Delivery",
					amount: 25,
					taxxable: false,
				},
			]),
		);

		const next = setSalesFormDeliveryOption(state, "delivery");

		const deliveryCosts = next.record?.extraCosts.filter(
			(cost) => cost.type === "Delivery",
		);
		expect(deliveryCosts).toHaveLength(1);
		expect(deliveryCosts?.[0]).toMatchObject({
			id: 41,
			label: "Freight & Handling",
			type: "Delivery",
			amount: 25,
		});
		expect(next.record?.summary?.delivery).toBe(25);
		expect(next.record?.summary?.grandTotal).toBe(125);
	});

	it("requires confirmation before Pickup can remove Delivery costs", () => {
		const state = createState(
			createRecord("delivery", [
				{
					label: "Freight",
					type: "Delivery",
					amount: 25,
				},
			]),
		);

		expect(setSalesFormDeliveryOption(state, "pickup")).toBe(state);
	});

	it("removes all Delivery rows after confirmation and preserves other costs", () => {
		const state = createState(
			createRecord("delivery", [
				{ id: 1, label: "Delivery", type: "Delivery", amount: 20 },
				{ id: 2, label: "Freight", type: "Delivery", amount: 5 },
				{
					id: 3,
					label: "Handling",
					type: "CustomNonTaxxable",
					amount: 10,
				},
				{ id: 4, label: "Labor", type: "Labor", amount: 5 },
			]),
		);

		const next = setSalesFormDeliveryOption(state, "pickup", {
			removeDeliveryCosts: true,
		});

		expect(next.record?.form?.deliveryOption).toBe("pickup");
		expect(next.record?.extraCosts.map((cost) => cost.type)).toEqual([
			"CustomNonTaxxable",
			"Labor",
		]);
		expect(next.record?.summary?.delivery).toBe(0);
		expect(next.record?.summary?.grandTotal).toBe(115);
	});

	it("changes to Pickup immediately when no Delivery cost exists", () => {
		const state = createState(
			createRecord("delivery", [
				{ label: "Handling", type: "CustomNonTaxxable", amount: 10 },
			]),
		);

		const next = setSalesFormDeliveryOption(state, "pickup");

		expect(next.record?.form?.deliveryOption).toBe("pickup");
		expect(next.record?.extraCosts.map((cost) => cost.type)).toEqual([
			"CustomNonTaxxable",
			"Labor",
		]);
	});

	it("leaves an already-selected method untouched and counts by canonical type", () => {
		const state = createState(createRecord("delivery"));

		expect(setSalesFormDeliveryOption(state, "delivery")).toBe(state);
		expect(
			countSalesFormDeliveryCosts([
				{ type: "Delivery" },
				{ type: "Delivery" },
				{ type: "CustomNonTaxxable" },
			]),
		).toBe(2);
	});
});
