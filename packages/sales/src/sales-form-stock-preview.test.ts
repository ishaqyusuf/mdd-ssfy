import { describe, expect, test } from "bun:test";
import {
	buildSalesFormStockCandidates,
	planSharedStockNeeds,
	salesFormStockPreviewSchema,
} from "./sales-form-stock-preview";
import { resolveComponentDemandQty } from "./sync-sales-inventory-line-items";
describe("sales form stock preview", () => {
	test("hinge piece requirements drive full and partial warehouse coverage", () => {
		const first = resolveComponentDemandQty({
			qty: 5,
			required: true,
			piecesPerUnit: 2,
		});
		const second = resolveComponentDemandQty({
			qty: 4,
			required: true,
			piecesPerUnit: 2,
		});
		expect([first, second]).toEqual([10, 8]);
		expect(
			resolveComponentDemandQty({ qty: 1.5, required: true, piecesPerUnit: 2 }),
		).toBe(3);
		expect(
			resolveComponentDemandQty({ qty: 5, required: false, piecesPerUnit: 2 }),
		).toBe(0);
		const needs = [
			{
				inventoryVariantId: 1,
				required: first,
				applied: 0,
				protectedInbound: 0,
			},
			{
				inventoryVariantId: 2,
				required: second,
				applied: 0,
				protectedInbound: 0,
			},
		];
		const before = planSharedStockNeeds(
			needs,
			new Map([
				[1, 10],
				[2, 6],
			]),
		);
		expect(before.map((row) => [row.applyQty, row.shortage])).toEqual([
			[10, 0],
			[6, 2],
		]);
		const after = planSharedStockNeeds(
			needs.map((row, i) => ({ ...row, applied: before[i]!.applyQty })),
			new Map([
				[1, 0],
				[2, 0],
			]),
		);
		expect(after.map((row) => [row.applyQty, row.shortage])).toEqual([
			[0, 0],
			[0, 2],
		]);
	});
	test("uses canonical step quantity projection and does not create stock writes", () => {
		const rows = buildSalesFormStockCandidates({
			lineItems: [
				{
					uid: "line",
					title: "Door",
					qty: 2,
					formSteps: [
						{
							prodUid: "jamb",
							qty: 3,
							step: { uid: "jamb-category", title: "Jamb" },
						},
					],
				},
			],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			inventoryUid: "jamb",
			inventoryCategoryUid: "jamb-category",
			variantUid: "jamb",
			qty: 3,
		});
	});
	test("shares a stock budget across repeated material and protects linked inbound", () => {
		const rows = planSharedStockNeeds(
			[
				{ inventoryVariantId: 1, required: 8, applied: 2, protectedInbound: 3 },
				{ inventoryVariantId: 1, required: 5, applied: 0, protectedInbound: 0 },
				{
					inventoryVariantId: null,
					required: 2,
					applied: 0,
					protectedInbound: 0,
				},
			],
			new Map([[1, 5]]),
		);
		expect(
			rows.map((row) => [row.available, row.applyQty, row.shortage]),
		).toEqual([
			[5, 3, 0],
			[2, 2, 3],
			[0, 0, 2],
		]);
	});
	test("reopened fully applied needs offer no further allocation", () => {
		expect(
			planSharedStockNeeds(
				[
					{
						inventoryVariantId: 1,
						required: 5,
						applied: 5,
						protectedInbound: 0,
					},
				],
				new Map([[1, 8]]),
			)[0],
		).toMatchObject({ applyQty: 0, shortage: 0 });
	});
	test("bounds preview payload size", () => {
		expect(
			salesFormStockPreviewSchema.safeParse({
				lineItems: Array.from({ length: 101 }, (_, i) => ({ uid: String(i) })),
			}).success,
		).toBe(false);
	});
});
