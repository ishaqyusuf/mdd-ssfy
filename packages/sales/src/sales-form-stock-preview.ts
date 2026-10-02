import type { Db } from "@gnd/db";
import { readCategoryStockSettings } from "@gnd/inventory";
import { z } from "zod";
import { salesFormPortableLineItemSchema } from "./sales-form/contracts/schemas";
import {
	buildInventorySyncComponentCandidatesForItem,
	resolveComponentDemandQty,
} from "./sync-sales-inventory-line-items";

export const salesFormStockPreviewSchema = z
	.object({
		lineItems: z.array(salesFormPortableLineItemSchema).max(100),
		profileCoefficient: z.number().finite().positive().nullable().optional(),
	})
	.refine(
		(input) => JSON.stringify(input).length <= 500_000,
		"Inventory preview is too large.",
	);

export function buildSalesFormStockCandidates(
	input: z.infer<typeof salesFormStockPreviewSchema>,
) {
	return input.lineItems.flatMap((line, index) => {
		const candidates = buildInventorySyncComponentCandidatesForItem(
			{
				id: line.id || -(index + 1),
				description: line.description || line.title || null,
				qty: line.qty,
				rate: line.unitPrice,
				total: line.lineTotal,
				meta: {
					...line.meta,
					formSteps: line.formSteps || [],
					shelfItems: line.shelfItems || [],
					housePackageTool: line.housePackageTool,
				},
				formSteps: [],
				shelfItems: [],
				housePackageTool: null,
			},
			{ profileCoefficient: input.profileCoefficient },
		);
		return candidates
			.filter((candidate) => candidate.required)
			.map((candidate) => ({
				...candidate,
				lineUid: line.uid,
				qty: candidate.qty,
			}));
	});
}
export function planSharedStockNeeds<
	T extends {
		inventoryVariantId: number | null;
		required: number;
		applied: number;
		protectedInbound: number;
	},
>(rows: T[], available: Map<number, number>) {
	const budgets = new Map(available);
	return rows.map((row) => {
		const remaining = Math.max(0, row.required - row.applied);
		const freeNeed = Math.max(0, remaining - row.protectedInbound);
		const availableQty = row.inventoryVariantId
			? budgets.get(row.inventoryVariantId) || 0
			: 0;
		const applyQty = Math.min(freeNeed, availableQty);
		if (row.inventoryVariantId)
			budgets.set(row.inventoryVariantId, availableQty - applyQty);
		return {
			...row,
			available: availableQty,
			applyQty,
			shortage: Math.max(0, freeNeed - applyQty),
		};
	});
}
export async function previewSalesFormStock(
	db: Db,
	input: z.infer<typeof salesFormStockPreviewSchema>,
) {
	const candidates = buildSalesFormStockCandidates(input);
	if (candidates.length > 2000)
		throw new Error("Too many inventory needs to preview.");
	const categories = await db.inventoryCategory.findMany({
		where: {
			uid: {
				in: [...new Set(candidates.map((row) => row.inventoryCategoryUid))],
			},
			deletedAt: null,
		},
		select: {
			id: true,
			uid: true,
			stockMode: true,
			productKind: true,
			meta: true,
		},
	});
	const variants = await db.inventoryVariant.findMany({
		where: {
			uid: { in: [...new Set(candidates.map((row) => row.variantUid))] },
			deletedAt: null,
			inventory: {
				deletedAt: null,
				inventoryCategoryId: { in: categories.map((row) => row.id) },
			},
		},
		select: {
			id: true,
			uid: true,
			inventory: {
				select: {
					uid: true,
					sourceComponentUid: true,
					inventoryCategoryId: true,
					productKind: true,
				},
			},
			stocks: { where: { deletedAt: null }, select: { id: true, qty: true } },
		},
	});
	const allocations = variants.length
		? await db.stockAllocation.groupBy({
				by: ["inventoryStockId"],
				where: {
					deletedAt: null,
					inventoryVariantId: { in: variants.map((row) => row.id) },
					inventoryStockId: { not: null },
					status: { in: ["approved", "reserved", "picked", "consumed"] },
				},
				_sum: { qty: true },
			})
		: [];
	const budgets = new Map(
		variants.map((variant) => [
			variant.id,
			variant.stocks.reduce(
				(qty, stock) =>
					qty +
					Math.max(
						0,
						stock.qty -
							Number(
								allocations.find((row) => row.inventoryStockId === stock.id)
									?._sum.qty || 0,
							),
					),
				0,
			),
		]),
	);
	const rows = candidates.flatMap((candidate) => {
		const matchedCategories = categories.filter(
			(row) => row.uid === candidate.inventoryCategoryUid,
		);
		if (
			matchedCategories.length === 1 &&
			(matchedCategories[0]?.stockMode !== "monitored" ||
				matchedCategories[0]?.productKind === "component")
		)
			return [];
		const category =
			matchedCategories.length === 1 ? matchedCategories[0] : null;
		const matched = variants.filter(
			(variant) =>
				variant.uid === candidate.variantUid &&
				(variant.inventory.sourceComponentUid || variant.inventory.uid) ===
					candidate.inventoryUid &&
				variant.inventory.inventoryCategoryId === category?.id,
		);
		const variant =
			matched.length === 1 && matched[0]?.inventory.productKind !== "component"
				? matched[0]
				: null;
		return [
			{
				key: `${candidate.lineUid}:${candidate.sourceType}:${candidate.sourceUid}:${candidate.variantUid}`,
				lineUid: candidate.lineUid,
				title: candidate.title,
				categoryId: category?.id || null,
				piecesPerUnit: readCategoryStockSettings(category?.meta).piecesPerUnit,
				inventoryVariantId: variant?.id || null,
				required: resolveComponentDemandQty({
					...candidate,
					piecesPerUnit: readCategoryStockSettings(category?.meta)
						.piecesPerUnit,
				}),
				applied: 0,
				protectedInbound: 0,
				mappingIssue: !category
					? "Category mapping required"
					: !variant
						? "Variant mapping required"
						: null,
				promptAvailableStock: readCategoryStockSettings(category?.meta)
					.promptAvailableStock,
			},
		];
	});
	return {
		rows: planSharedStockNeeds(rows, budgets),
		canApply: false,
		unsaved: true,
	};
}
