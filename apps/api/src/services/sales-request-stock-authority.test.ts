import { describe, expect, test } from "bun:test";
import type { SalesFormLineItemRecord } from "@gnd/sales/sales-form";
import {
	type SalesRequestStockAuthorityDatabase,
	resolveSalesRequestStockAuthority,
} from "./sales-request-stock-authority";

type InventoryRow = Awaited<
	ReturnType<SalesRequestStockAuthorityDatabase["inventory"]["findMany"]>
>[number];
type VariantRow = Awaited<
	ReturnType<SalesRequestStockAuthorityDatabase["inventoryVariant"]["findMany"]>
>[number];
type StockRow = Awaited<
	ReturnType<SalesRequestStockAuthorityDatabase["inventoryStock"]["findMany"]>
>[number];
type AllocationRow = Awaited<
	ReturnType<SalesRequestStockAuthorityDatabase["stockAllocation"]["findMany"]>
>[number];

type Rows = {
	inventories: InventoryRow[];
	variants: VariantRow[];
	stocks: StockRow[];
	allocations: AllocationRow[];
};

function required<T>(value: T | undefined, message: string): T {
	if (value === undefined) throw new Error(message);
	return value;
}

function componentLine(
	patch: Partial<SalesFormLineItemRecord> & {
		uid?: string | null;
		sourceUid?: string;
		categoryUid?: string;
		componentQty?: unknown;
	} = {},
): SalesFormLineItemRecord {
	const sourceUid = patch.sourceUid ?? "door-panel";
	const categoryUid = patch.categoryUid ?? "door-step";
	const componentQty = patch.componentQty ?? 2;
	return {
		uid: patch.uid === undefined ? "line-1" : patch.uid,
		title: "Door panel",
		qty: 1,
		meta: {},
		formSteps: [
			{
				prodUid: sourceUid,
				qty: componentQty,
				value: "Door panel",
				step: { uid: categoryUid, title: "Door" },
				component: { uid: sourceUid, name: "Door panel" },
				meta: {
					selectedComponents: [{ id: 11, uid: sourceUid, title: "Door panel" }],
				},
			},
		],
		...patch,
	};
}

function baseRows(): Rows {
	return {
		inventories: [
			{
				id: 10,
				uid: "door-panel",
				inventoryCategoryId: 20,
				productKind: "inventory",
				stockMode: "monitored",
				deletedAt: null,
				inventoryCategory: {
					id: 20,
					uid: "door-step",
					productKind: "inventory",
					stockMode: "monitored",
					deletedAt: null,
				},
			},
		],
		variants: [{ id: 30, uid: "door-panel", inventoryId: 10, deletedAt: null }],
		stocks: [{ id: 40, inventoryVariantId: 30, qty: 10, deletedAt: null }],
		allocations: [
			{
				id: 50,
				inventoryVariantId: 30,
				inventoryStockId: 40,
				qty: 2,
				status: "reserved",
				deletedAt: null,
			},
			{
				id: 51,
				inventoryVariantId: 30,
				inventoryStockId: 40,
				qty: 1,
				status: "pending_review",
				deletedAt: null,
			},
		],
	};
}

function database(
	rows: Rows,
	onRead?: (model: keyof Rows, args: unknown) => void,
): SalesRequestStockAuthorityDatabase {
	return {
		inventory: {
			findMany: async (args) => {
				onRead?.("inventories", args);
				return rows.inventories;
			},
		},
		inventoryVariant: {
			findMany: async (args) => {
				onRead?.("variants", args);
				return rows.variants;
			},
		},
		inventoryStock: {
			findMany: async (args) => {
				onRead?.("stocks", args);
				return rows.stocks;
			},
		},
		stockAllocation: {
			findMany: async (args) => {
				onRead?.("allocations", args);
				return rows.allocations;
			},
		},
	};
}

const resolve = (
	rows: Rows,
	lineItems: readonly SalesFormLineItemRecord[] = [componentLine()],
	onRead?: (model: keyof Rows, args: unknown) => void,
) =>
	resolveSalesRequestStockAuthority({
		db: database(rows, onRead),
		candidate: { lineItems },
	});

describe("Sales Request stock authority", () => {
	test("maps native component requirements and resolves read-only physical capacity", async () => {
		const reads: Array<{ model: keyof Rows; args: unknown }> = [];
		const result = await resolve(baseRows(), [componentLine()], (model, args) =>
			reads.push({ model, args }),
		);

		expect(result).toEqual({
			ok: true,
			issues: [],
			authority: {
				schemaVersion: 1,
				revision: expect.stringMatching(/^sa1:[a-f0-9]{64}$/),
				requirements: [
					{
						lineUid: "line-1",
						sourceType: "dyke-step-product",
						sourceUid: "door-panel",
						inventoryUid: "door-panel",
						variantUid: "door-panel",
						categoryUid: "door-step",
						requiredQty: 2,
						inventoryId: 10,
						inventoryVariantId: 30,
						inventoryCategoryId: 20,
						physicalQty: 10,
						committedQty: 2,
						pendingReviewQty: 1,
						availableQty: 7,
					},
				],
			},
		});
		expect(reads.map(({ model }) => model).sort()).toEqual([
			"allocations",
			"inventories",
			"stocks",
			"variants",
		]);
		expect(
			reads.find(({ model }) => model === "allocations")?.args,
		).toMatchObject({
			where: {
				deletedAt: null,
				status: {
					in: ["pending_review", "approved", "reserved", "picked", "consumed"],
				},
			},
		});
	});

	test("rejects missing and ambiguous inventory or variant mappings", async () => {
		const missingInventory = baseRows();
		missingInventory.inventories = [];
		expect(await resolve(missingInventory)).toEqual({
			ok: false,
			issues: [
				{
					code: "inventory-not-found",
					lineUid: "line-1",
					inventoryUid: "door-panel",
				},
			],
			authority: null,
		});

		const ambiguousInventory = baseRows();
		ambiguousInventory.inventories.push({
			...required(
				ambiguousInventory.inventories[0],
				"Expected inventory fixture",
			),
			id: 11,
		});
		expect((await resolve(ambiguousInventory)).issues[0]?.code).toBe(
			"inventory-ambiguous",
		);

		const missingVariant = baseRows();
		missingVariant.variants = [];
		expect((await resolve(missingVariant)).issues[0]?.code).toBe(
			"inventory-variant-not-found",
		);

		const ambiguousVariant = baseRows();
		ambiguousVariant.variants.push({
			...required(ambiguousVariant.variants[0], "Expected variant fixture"),
			id: 31,
		});
		expect((await resolve(ambiguousVariant)).issues[0]?.code).toBe(
			"inventory-variant-ambiguous",
		);
	});

	test("rejects insufficient and already-overcommitted stock", async () => {
		const insufficient = baseRows();
		required(insufficient.stocks[0], "Expected stock fixture").qty = 4;
		expect((await resolve(insufficient)).issues).toContainEqual({
			code: "stock-insufficient",
			lineUid: "line-1",
			sourceUid: "door-panel",
			requiredQty: 2,
			availableQty: 1,
		});

		const overcommitted = baseRows();
		required(overcommitted.stocks[0], "Expected stock fixture").qty = 2;
		expect((await resolve(overcommitted)).issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "stock-overcommitted",
					inventoryUid: "door-panel",
					variantUid: "door-panel",
					availableQty: -1,
				}),
				expect.objectContaining({
					code: "stock-insufficient",
					requiredQty: 2,
					availableQty: -1,
				}),
			]),
		);

		const oneLotOvercommitted = baseRows();
		required(oneLotOvercommitted.stocks[0], "Expected stock fixture").qty = 2;
		oneLotOvercommitted.stocks.push({
			id: 41,
			inventoryVariantId: 30,
			qty: 10,
			deletedAt: null,
		});
		expect((await resolve(oneLotOvercommitted)).issues).toContainEqual(
			expect.objectContaining({
				code: "stock-overcommitted",
				inventoryStockId: 40,
				availableQty: -1,
			}),
		);
	});

	test("treats pending-review suggestions as occupied automatic-save capacity", async () => {
		const rows = baseRows();
		required(rows.stocks[0], "Expected stock fixture").qty = 5;
		rows.allocations = [
			{
				id: 51,
				inventoryVariantId: 30,
				inventoryStockId: 40,
				qty: 4,
				status: "pending_review",
				deletedAt: null,
			},
		];

		expect((await resolve(rows)).issues).toContainEqual({
			code: "stock-insufficient",
			lineUid: "line-1",
			sourceUid: "door-panel",
			requiredQty: 2,
			availableQty: 1,
		});
	});

	test("rejects shelf and service lines before database access", async () => {
		for (const line of [
			componentLine({ shelfItems: [{ productId: 1, categoryId: 2, qty: 1 }] }),
			componentLine({ formSteps: [], meta: { itemType: "Services" } }),
		]) {
			const reads: string[] = [];
			const result = await resolve(baseRows(), [line], (model) =>
				reads.push(model),
			);
			expect(result.ok).toBe(false);
			expect(result.issues[0]?.code).toBe(
				line.shelfItems?.length
					? "shelf-items-not-supported"
					: "services-not-supported",
			);
			expect(reads).toEqual([]);
		}
	});

	test("rejects malformed and duplicate native identities or quantities before reads", async () => {
		const malformedCases: Array<{
			lines: SalesFormLineItemRecord[];
			code: string;
		}> = [
			{ lines: [componentLine({ uid: " " })], code: "line-identity-invalid" },
			{
				lines: [componentLine(), componentLine()],
				code: "line-identity-invalid",
			},
			{
				lines: [componentLine({ componentQty: "2" })],
				code: "component-quantity-invalid",
			},
			{
				lines: [componentLine({ qty: "1" })],
				code: "component-quantity-invalid",
			},
			{
				lines: [
					componentLine({
						formSteps: [
							{
								prodUid: "door-panel",
								qty: 1,
								step: null,
							},
						],
					}),
				],
				code: "component-identity-missing",
			},
			{
				lines: [
					componentLine({
						meta: { mouldingRows: [{ uid: "trim", qty: "2" }] },
					}),
				],
				code: "moulding-quantity-invalid",
			},
		];

		for (const malformed of malformedCases) {
			const reads: string[] = [];
			const result = await resolve(baseRows(), malformed.lines, (model) =>
				reads.push(model),
			);
			expect(result.issues.map(({ code }) => code)).toContain(malformed.code);
			expect(reads).toEqual([]);
		}
	});

	test("accepts an exact component selection even when the step exposes multiple choices", async () => {
		const line = componentLine({
			formSteps: [
				{
					prodUid: null,
					qty: 2,
					step: { uid: "door-step", title: "Door" },
					component: { uid: "door-panel", name: "Door panel" },
					meta: {
						selectedComponents: [
							{ id: 11, uid: "door-panel", title: "Door panel" },
							{ id: 12, uid: "other-door", title: "Other door" },
						],
					},
				},
			],
		});

		expect((await resolve(baseRows(), [line])).ok).toBe(true);
	});

	test("resolves an HPT door through the native stepProductId snapshot", async () => {
		const line = componentLine({
			qty: 2,
			formSteps: [
				{
					prodUid: "door-panel",
					qty: 1,
					step: { uid: "door-step", title: "Door" },
					component: { uid: "door-panel", name: "Door panel" },
					meta: {
						selectedComponents: [
							{ id: 501, uid: "door-panel", title: "Door panel" },
						],
					},
				},
			],
			housePackageTool: {
				totalDoors: 2,
				doors: [{ stepProductId: 501, totalQty: 2, dimension: "3-0 x 6-8" }],
			},
		});
		const rows = baseRows();
		required(rows.variants[0], "Expected variant fixture").uid = "w3_0-h6_8";

		const result = await resolve(rows, [line]);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected HPT stock authority");
		expect(result.authority.requirements).toMatchObject([
			{
				sourceType: "dyke-door-product",
				sourceUid: "door-panel",
				variantUid: "w3_0-h6_8",
				requiredQty: 2,
			},
		]);
	});

	test("resolves every native Mouldings multi-selection row with its own quantity", async () => {
		const line = componentLine({
			uid: "moulding-line",
			qty: 31,
			formSteps: [
				{
					prodUid: "baseboard-16",
					qty: 1,
					step: { uid: "moulding-step", title: "Mouldings" },
					component: { uid: "baseboard-16", name: "Baseboard" },
					meta: {
						selectedProdUids: ["baseboard-16", "casing-17"],
						selectedComponents: [
							{ id: 61, uid: "baseboard-16", title: "Baseboard" },
							{ id: 62, uid: "casing-17", title: "Casing" },
						],
					},
				},
			],
			meta: {
				mouldingRows: [
					{ uid: "baseboard-16", title: "Baseboard", qty: 28 },
					{ uid: "casing-17", title: "Casing", qty: 3 },
				],
			},
		});
		const rows = baseRows();
		rows.inventories = ["baseboard-16", "casing-17"].map((uid, index) => ({
			id: 70 + index,
			uid,
			inventoryCategoryId: 80,
			productKind: "inventory",
			stockMode: "monitored",
			deletedAt: null,
			inventoryCategory: {
				id: 80,
				uid: "moulding-step",
				productKind: "inventory",
				stockMode: "monitored",
				deletedAt: null,
			},
		}));
		rows.variants = rows.inventories.map((inventory, index) => ({
			id: 90 + index,
			uid: inventory.uid,
			inventoryId: inventory.id,
			deletedAt: null,
		}));
		rows.stocks = rows.variants.map((variant, index) => ({
			id: 100 + index,
			inventoryVariantId: variant.id,
			qty: 50,
			deletedAt: null,
		}));
		rows.allocations = [];

		const result = await resolve(rows, [line]);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected Mouldings stock authority");
		expect(
			result.authority.requirements.map(({ sourceUid, requiredQty }) => ({
				sourceUid,
				requiredQty,
			})),
		).toEqual([
			{ sourceUid: "baseboard-16", requiredQty: 28 },
			{ sourceUid: "casing-17", requiredQty: 3 },
		]);
	});

	test("produces the same revision and requirement order for equivalent read order", async () => {
		const rows = baseRows();
		rows.inventories.push({
			id: 11,
			uid: "jamb",
			inventoryCategoryId: 21,
			productKind: "inventory",
			stockMode: "monitored",
			deletedAt: null,
			inventoryCategory: {
				id: 21,
				uid: "jamb-step",
				productKind: "inventory",
				stockMode: "monitored",
				deletedAt: null,
			},
		});
		rows.variants.push({
			id: 31,
			uid: "jamb",
			inventoryId: 11,
			deletedAt: null,
		});
		rows.stocks.push({
			id: 41,
			inventoryVariantId: 31,
			qty: 6,
			deletedAt: null,
		});
		const lines = [
			componentLine(),
			componentLine({
				uid: "line-2",
				sourceUid: "jamb",
				categoryUid: "jamb-step",
				componentQty: 1,
			}),
		];

		const first = await resolve(rows, lines);
		const reversed = await resolve(
			{
				inventories: rows.inventories.toReversed(),
				variants: rows.variants.toReversed(),
				stocks: rows.stocks.toReversed(),
				allocations: rows.allocations.toReversed(),
			},
			lines.toReversed(),
		);
		expect(first).toEqual(reversed);

		const changedRows = structuredClone(rows);
		required(changedRows.allocations[0], "Expected allocation fixture").qty = 3;
		const changed = await resolve(changedRows, lines);
		if (!first.ok || !changed.ok) throw new Error("Expected stock authority");
		expect(changed.authority.revision).not.toBe(first.authority.revision);
	});

	test("post-validates deleted rows and malformed allocation bindings", async () => {
		const deletedInventory = baseRows();
		required(
			deletedInventory.inventories[0],
			"Expected inventory fixture",
		).deletedAt = new Date();
		expect((await resolve(deletedInventory)).issues[0]?.code).toBe(
			"inventory-identity-invalid",
		);

		const malformedAllocation = baseRows();
		required(
			malformedAllocation.allocations[0],
			"Expected allocation fixture",
		).inventoryStockId = null;
		expect((await resolve(malformedAllocation)).issues[0]?.code).toBe(
			"allocation-stock-mismatch",
		);
	});
});
