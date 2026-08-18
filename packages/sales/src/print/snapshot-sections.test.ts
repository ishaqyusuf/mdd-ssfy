import { describe, expect, it } from "bun:test";
import type { SalesSetting } from "../exports";
import { buildInvoicePrintSectionsFromSalesFormSnapshot } from "./snapshot-sections";

const setting = {
	id: 1,
	data: {
		route: {
			interior: {
				config: { noHandle: false, hasSwing: true },
			},
		},
	},
} as unknown as SalesSetting;

describe("invoice print sections from a sales-form snapshot", () => {
	it("uses the canonical invoice composers for every customer-visible item family", () => {
		const sections = buildInvoicePrintSectionsFromSalesFormSnapshot({
			salesOrderId: 42,
			revisionDate: "2026-08-18T12:00:00.000Z",
			setting,
			lineItems: [
				{
					uid: "generic-1",
					title: "Hardware",
					description: "Privacy lever",
					qty: 2,
					unitPrice: 45,
					lineTotal: 90,
					meta: { lineIndex: 0, img: "hardware.png" },
					formSteps: [
						{
							step: { id: 3, title: "Finish" },
							value: "Satin nickel",
						},
					],
				},
				{
					uid: "door-1",
					title: "Interior door",
					description: "Interior door",
					qty: 2,
					unitPrice: 100,
					lineTotal: 200,
					meta: { lineIndex: 1 },
					formSteps: [
						{
							prodUid: "interior",
							step: { id: 1, title: "Item Type" },
							value: "Interior",
						},
						{
							step: { id: 2, title: "Bore" },
							value: "Single bore",
						},
					],
					housePackageTool: {
						doorType: "Interior",
						doors: [
							{
								dimension: "3-0 x 6-8",
								swing: "Inswing",
								lhQty: 1,
								rhQty: 1,
								totalQty: 2,
								unitPrice: 100,
								lineTotal: 200,
								stepProduct: {
									name: "Carrara",
									img: "carrara.png",
								},
							},
						],
					},
				},
				{
					uid: "moulding-primary",
					title: "Trim package",
					description: "Trim package",
					qty: 2,
					unitPrice: 70,
					lineTotal: 140,
					multiDyke: true,
					multiDykeUid: "trim-group",
					meta: {
						lineIndex: 2,
						mouldingRows: [
							{ uid: "m-1", title: "Casing", qty: 2, salesPrice: 70 },
						],
					},
					formSteps: [
						{ step: { id: 1, title: "Item Type" }, value: "Moulding" },
						{
							step: { id: 2, title: "Moulding" },
							meta: {
								selectedComponents: [
									{
										uid: "m-1",
										title: "Colonial casing",
										img: "casing.png",
									},
								],
							},
						},
					],
				},
				{
					uid: "moulding-sibling",
					title: "Duplicate trim sibling",
					description: "Duplicate trim sibling",
					qty: 2,
					unitPrice: 70,
					lineTotal: 140,
					multiDyke: false,
					multiDykeUid: "trim-group",
					meta: { lineIndex: 3 },
				},
				{
					uid: "service-1",
					title: "Services",
					description: "Install",
					qty: 1,
					unitPrice: 80,
					lineTotal: 80,
					meta: {
						lineIndex: 4,
						serviceRows: [
							{ uid: "svc-1", service: "Install", qty: 1, unitPrice: 80 },
						],
					},
					formSteps: [
						{ step: { id: 1, title: "Item Type" }, value: "Services" },
					],
				},
				{
					uid: "shelf-1",
					title: "Shelf items",
					description: "Shelf items",
					qty: 1,
					unitPrice: 25,
					lineTotal: 25,
					meta: { lineIndex: 5 },
					shelfItems: [
						{
							description: "Oak shelf",
							qty: 1,
							unitPrice: 25,
							totalPrice: 25,
							shelfProduct: { img: "shelf.png" },
						},
					],
				},
			],
		});

		expect(sections.map((section) => section.kind)).toEqual([
			"line-item",
			"door",
			"moulding",
			"service",
			"shelf",
		]);
		expect(JSON.stringify(sections)).toContain("PRIVACY LEVER");
		expect(JSON.stringify(sections)).toContain("Satin nickel");
		expect(JSON.stringify(sections)).toContain("carrara.png");
		expect(JSON.stringify(sections)).toContain("Colonial casing");
		expect(JSON.stringify(sections)).toContain("Install");
		expect(JSON.stringify(sections)).toContain("Oak shelf");
		expect(JSON.stringify(sections)).not.toContain("Duplicate trim sibling");

		const door = sections.find((section) => section.kind === "door");
		expect(door?.headers.map((header) => header.title)).toContain("LH");
		expect(door?.headers.map((header) => header.title)).toContain("RH");
		expect(door?.rows[0]?.cells.at(-2)?.value).toBe("$100.00");
		expect(door?.rows[0]?.cells.at(-1)?.value).toBe("$200.00");
	});

	it("returns no partial preview when any saved line is invalid", () => {
		expect(
			buildInvoicePrintSectionsFromSalesFormSnapshot({
				lineItems: [
					{
						uid: "incomplete",
						title: "Incomplete item",
						qty: 1,
					},
				],
			}),
		).toEqual([]);
	});
});
