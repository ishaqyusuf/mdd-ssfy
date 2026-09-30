import { describe, expect, it } from "bun:test";
import {
	buildSalesChanges,
	salesChangeStatusLabel,
	summarizeSalesItemChanges,
	salesChangeActivityStatus,
} from "./sales-change-history";

const snapshot = () => ({
	form: { po: "PO-1", notes: "Original" },
	summary: { subTotal: 500, taxTotal: 0, grandTotal: 500 },
	lineItems: [
		{
			id: 1,
			uid: "door",
			title: "Interior door",
			qty: 5,
			unitPrice: 100,
			lineTotal: 500,
			housePackageTool: {
				doors: [
					{
						id: 22,
						dimension: "30 x 80",
						totalQty: 5,
						lhQty: 3,
						rhQty: 2,
						lineTotal: 500,
					},
				],
			},
		},
	],
	extraCosts: [],
});

describe("basic sales activity summaries", () => {
	it("shows mixed quantity increases and decreases without prices", () => {
		const before = {
			lineItems: [
				{ uid: "a", title: "Item X", qty: 1, unitPrice: 20 },
				{ uid: "b", title: "Item Y", qty: 5 },
			],
			summary: { grandTotal: 120 },
		};
		const after = {
			lineItems: [
				{ uid: "a", title: "Item X", qty: 2, unitPrice: 30 },
				{ uid: "b", title: "Item Y", qty: 3 },
			],
			summary: { grandTotal: 160 },
		};
		expect(summarizeSalesItemChanges(buildSalesChanges(before, after))).toEqual(
			{
				messages: ["Item X: quantity 1 → 2", "Item Y: quantity 5 → 3"],
				itemCount: 2,
			},
		);
	});
	it("describes additions and removals once with their quantities", () => {
		const before = {
			lineItems: [{ uid: "old", title: "Item X", qty: 2, unitPrice: 25 }],
		};
		const after = {
			lineItems: [{ uid: "new", title: "Item Y", qty: 3, unitPrice: 10 }],
		};
		expect(summarizeSalesItemChanges(buildSalesChanges(before, after))).toEqual(
			{
				messages: [
					"Item X: removed, previous quantity 2",
					"Item Y: added, quantity 3",
				],
				itemCount: 2,
			},
		);
	});
	it("keeps named service changes and suppresses the repeating group", () => {
		const before = {
			lineItems: [
				{
					uid: "services",
					title: "Services",
					qty: 1,
					meta: {
						serviceRows: [
							{ uid: "frame", service: "Pocket Door Frame", qty: 1 },
						],
					},
				},
			],
		};
		const after = {
			lineItems: [
				{
					uid: "services",
					title: "Services",
					qty: 2,
					meta: {
						serviceRows: [
							{ uid: "frame", service: "Pocket Door Frame", qty: 2 },
						],
					},
				},
			],
		};
		expect(summarizeSalesItemChanges(buildSalesChanges(before, after))).toEqual(
			{ messages: ["Pocket Door Frame: quantity 1 → 2"], itemCount: 1 },
		);
	});
	it("keeps a size removal once without listing its configuration", () => {
		const before = snapshot();
		const after = snapshot();
		after.lineItems[0]!.qty = 0;
		after.lineItems[0]!.housePackageTool.doors = [];
		expect(summarizeSalesItemChanges(buildSalesChanges(before, after))).toEqual(
			{
				messages: ["Interior door · 30 x 80: removed, previous quantity 5"],
				itemCount: 1,
			},
		);
	});
	it("uses a basic fallback for price, header and generated-default changes", () => {
		const before = snapshot(),
			after = snapshot();
		after.lineItems[0]!.unitPrice = 200;
		after.form.po = "PO-2";
		after.summary.grandTotal = 1000;
		const changes = buildSalesChanges(before, after);
		changes.push({
			key: "cost:Labor:presence",
			item: "Labor",
			field: "Item",
			before: null,
			after: "Added",
		});
		expect(summarizeSalesItemChanges(changes)).toEqual({
			messages: ["Sale details updated"],
			itemCount: 0,
		});
	});
	it("only shows a short status when attention or approval is needed", () => {
		expect(salesChangeActivityStatus("APPLIED")).toBeNull();
		expect(salesChangeActivityStatus("APPROVED")).toBe("Awaiting application");
		expect(salesChangeActivityStatus("APPROVED", true)).toBe("Needs attention");
	});
});

describe("saved sales comparisons", () => {
	it("retains a full reduction, price, size and header comparison", () => {
		const before = snapshot(),
			after = snapshot();
		after.form.po = "PO-2";
		after.lineItems[0]!.qty = 3;
		after.lineItems[0]!.unitPrice = 110;
		after.lineItems[0]!.lineTotal = 330;
		after.lineItems[0]!.housePackageTool.doors[0]!.dimension = "32 x 80";
		after.summary.grandTotal = 330;
		const changes = buildSalesChanges(before, after);
		expect(changes).toContainEqual({
			key: "form:po",
			item: "Sale details",
			field: "PO number",
			before: "PO-1",
			after: "PO-2",
		});
		expect(changes.find((change) => change.field === "Quantity")).toMatchObject(
			{ before: "5", after: "3" },
		);
		expect(
			changes.find((change) => change.field === "Unit price"),
		).toMatchObject({ before: "$100.00", after: "$110.00" });
		expect(changes.find((change) => change.field === "Size")).toMatchObject({
			before: "30 x 80",
			after: "32 x 80",
		});
		expect(
			changes.find((change) => change.field === "Order total"),
		).toMatchObject({ before: "$500.00", after: "$330.00" });
	});
	it("ignores versions, generated identities and equivalent date formats", () => {
		const before = {
			...snapshot(),
			version: "v1",
			form: { paymentDueDate: "2026-10-10" },
		};
		const after = {
			...snapshot(),
			version: "v2",
			updatedAt: new Date(),
			form: { paymentDueDate: "2026-10-10T00:00:00.000Z" },
		};
		after.lineItems[0]!.id = 100;
		expect(buildSalesChanges(before, after)).toEqual([]);
	});
	it("captures added and removed items even when the total is unchanged", () => {
		const before = snapshot(),
			after = snapshot();
		after.lineItems[0]!.uid = "replacement";
		const changes = buildSalesChanges(before, after);
		expect(
			changes
				.filter((change) => /^line:[^:]+:presence$/.test(change.key))
				.map((change) => change.after),
		).toEqual(["Removed", "Added"]);
	});
	it("captures service component edits with unchanged parent quantity", () => {
		const before = {
			lineItems: [
				{
					uid: "services",
					title: "Services",
					qty: 1,
					meta: {
						serviceRows: [
							{ uid: "install", service: "Install", qty: 1, unitPrice: 50 },
						],
					},
				},
			],
		};
		const after = {
			lineItems: [
				{
					uid: "services",
					title: "Services",
					qty: 1,
					meta: {
						serviceRows: [
							{ uid: "install", service: "Install", qty: 1, unitPrice: 70 },
						],
					},
				},
			],
		};
		expect(buildSalesChanges(before, after)).toHaveLength(1);
		expect(buildSalesChanges(before, after)[0]).toMatchObject({
			field: "Unit price",
			before: "$50.00",
			after: "$70.00",
		});
	});
	it("doesn't omit increases from a mixed reduction review", () => {
		const before = {
			lineItems: [
				{ uid: "a", qty: 4 },
				{ uid: "b", qty: 2 },
			],
		};
		const after = {
			lineItems: [
				{ uid: "a", qty: 3 },
				{ uid: "b", qty: 5 },
			],
		};
		expect(
			buildSalesChanges(before, after).filter(
				(change) => change.field === "Quantity",
			),
		).toHaveLength(2);
	});
	it("keeps failure and approval distinct from application", () => {
		expect(salesChangeStatusLabel("APPROVED")).toBe(
			"Approved · awaiting application",
		);
		expect(salesChangeStatusLabel("APPROVED", true)).toContain("failed");
		expect(salesChangeStatusLabel("APPLIED_WITH_REVIEW")).toBe(
			"Applied · operational review needed",
		);
	});
});

it("ignores generated zero charges and inferred parent tax flags", () => {
	const before = {
		lineItems: [
			{
				uid: "services",
				title: "Services",
				meta: { serviceRows: [{ uid: "row", qty: 1, taxxable: true }] },
			},
		],
	};
	const after = {
		...before,
		lineItems: before.lineItems.map((line) => ({ ...line, taxxable: true })),
		extraCosts: [{ type: "Labor", label: "Labor", amount: 0, taxxable: false }],
	};
	expect(buildSalesChanges(before, after)).toEqual([]);
});
