import { describe, expect, it } from "bun:test";

import {
	hydrateSalesFormRecord,
	validateSalesFormBeforeSave,
} from "./record-normalization";

describe("record-normalization application", () => {
	it("validates the shared save prerequisites", () => {
		expect(
			validateSalesFormBeforeSave({ form: {}, lineItems: [{ uid: "line-1" }] }),
		).toMatchObject({
			valid: false,
			code: "customer_required",
			message: "Select a customer before saving.",
		});
		expect(
			validateSalesFormBeforeSave({ form: { customerId: 101 }, lineItems: [] }),
		).toMatchObject({
			valid: false,
			code: "line_item_required",
			message: "Add at least one line item before saving.",
		});
		expect(
			validateSalesFormBeforeSave({
				form: { customerId: 101 },
				lineItems: [{ uid: "line-1" }],
			}),
		).toEqual({ valid: true, code: null, title: null, message: null });
	});

	it("hydrates shelf rows from row totals instead of stale line totals", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "shelf-stale",
					title: "Shelf stale",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					shelfItems: [
						{
							productId: 7,
							description: "Profile shelf",
							qty: 2,
							unitPrice: 25,
							totalPrice: 50,
						},
					],
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		expect(record.lineItems[0]?.qty).toBe(2);
		expect(record.lineItems[0]?.unitPrice).toBe(25);
		expect(record.lineItems[0]?.lineTotal).toBe(50);
		expect(record.summary.subTotal).toBe(50);
		expect(record.summary.taxableSubTotal).toBe(50);
		expect(record.summary.taxTotal).toBe(5);
	});

	it("hydrates service rows from grouped row quantities and totals", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "service-stale",
					title: "Service stale",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					meta: {
						serviceRows: [
							{
								uid: "svc-a",
								service: "Install",
								qty: 2,
								unitPrice: 30,
								taxxable: true,
							},
							{
								uid: "svc-b",
								service: "Finish",
								qty: 1,
								unitPrice: 10,
								taxxable: true,
							},
						],
					},
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		expect(record.lineItems[0]?.qty).toBe(3);
		expect(record.lineItems[0]?.unitPrice).toBe(23.33);
		expect(record.lineItems[0]?.lineTotal).toBe(70);
		expect(record.summary.subTotal).toBe(70);
		expect(record.summary.taxableSubTotal).toBe(70);
		expect(record.summary.taxTotal).toBe(7);
	});

	it("hydrates service rows from JSON line metadata", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "service-json",
					title: "Service json",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					meta: JSON.stringify({
						serviceRows: [
							{
								uid: "svc-a",
								service: "Install",
								qty: 3,
								unitPrice: 25,
								taxxable: true,
							},
						],
					}),
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		expect(record.lineItems[0]?.qty).toBe(3);
		expect(record.lineItems[0]?.unitPrice).toBe(25);
		expect(record.lineItems[0]?.lineTotal).toBe(75);
		expect(record.summary.subTotal).toBe(75);
		expect(record.summary.taxTotal).toBe(7.5);
	});

	it("hydrates moulding rows from JSON line metadata", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "moulding-json",
					title: "Moulding json",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					meta: JSON.stringify({
						mouldingRows: [
							{
								uid: "moulding-a",
								title: "Casing",
								qty: 2,
								salesPrice: 20,
								addon: 3,
							},
						],
					}),
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		expect(record.lineItems[0]?.qty).toBe(2);
		expect(record.lineItems[0]?.unitPrice).toBe(23);
		expect(record.lineItems[0]?.lineTotal).toBe(46);
		expect(record.summary.subTotal).toBe(46);
		expect(record.summary.taxTotal).toBe(4.6);
	});

	it("hydrates HPT doors with stored no-handle route config", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "hpt-no-handle",
					title: "Door workflow",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					meta: {
						workflowDoorRouteConfig: {
							noHandle: true,
							hasSwing: false,
						},
					},
					housePackageTool: {
						id: null,
						totalDoors: 99,
						totalPrice: 999,
						doors: [
							{
								dimension: "2 x 8",
								swing: "LH",
								lhQty: 2,
								rhQty: 3,
								totalQty: 4,
								unitPrice: 25,
								lineTotal: 100,
							},
						],
					},
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		const door = record.lineItems[0]?.housePackageTool?.doors?.[0];
		expect(record.lineItems[0]?.qty).toBe(4);
		expect(record.lineItems[0]?.unitPrice).toBe(25);
		expect(record.lineItems[0]?.lineTotal).toBe(100);
		expect(record.summary.subTotal).toBe(100);
		expect(record.summary.taxTotal).toBe(10);
		expect(door?.lhQty).toBe(0);
		expect(door?.rhQty).toBe(0);
		expect(door?.swing).toBe("");
	});

	it("hydrates HPT doors with JSON stored no-handle route config", () => {
		const record = hydrateSalesFormRecord({
			type: "order",
			salesId: null,
			slug: null,
			form: { customerId: 101 },
			lineItems: [
				{
					uid: "hpt-json-no-handle",
					title: "Door workflow",
					qty: 99,
					unitPrice: 999,
					lineTotal: 999,
					taxxable: true,
					meta: JSON.stringify({
						workflowDoorRouteConfig: {
							noHandle: true,
							hasSwing: false,
						},
					}),
					housePackageTool: {
						id: null,
						totalDoors: 99,
						totalPrice: 999,
						doors: [
							{
								dimension: "2 x 8",
								swing: "LH",
								lhQty: 2,
								rhQty: 3,
								totalQty: 4,
								unitPrice: 25,
								lineTotal: 100,
							},
						],
					},
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 999,
				adjustedSubTotal: 999,
				taxRate: 10,
				taxTotal: 99.9,
				grandTotal: 1098.9,
			},
		});

		const door = record.lineItems[0]?.housePackageTool?.doors?.[0];
		expect(door?.lhQty).toBe(0);
		expect(door?.rhQty).toBe(0);
		expect(door?.swing).toBe("");
	});
});
