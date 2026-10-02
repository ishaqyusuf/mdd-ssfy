import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { z } from "zod";
import { StockAdjustmentError } from "./stock-adjustment";
import { readCategoryStockSettings } from "./stock-settings";
export { readCategoryStockSettings } from "./stock-settings";

const id = z.number().int().positive();
export const stockPolicySelectorSchema = z.union([
	z.object({ categoryId: id }),
	z.object({ stepId: id }),
]);
export const categoryStockPolicySchema = z.object({
	categoryId: id,
	tracked: z.boolean(),
	lowStockAlert: z.number().int().nonnegative().max(2147483647),
	promptAvailableStock: z.boolean(),
	piecesPerUnit: z.number().int().positive().max(10000).optional(),
	stockUnit: z.enum(["unit", "kit", "length"]).nullable().optional(),
});
export const variantStockThresholdSchema = z.object({
	inventoryVariantId: id,
	lowStockAlert: z.number().int().nonnegative().max(2147483647).nullable(),
});
export const variantStockAlertsSchema = z.object({
	inventoryVariantId: id,
	enabled: z.boolean(),
});

export async function setVariantStockAlerts(
	db: Db,
	input: z.infer<typeof variantStockAlertsSchema>,
) {
	const result = await db.inventoryVariant.updateMany({
		where: {
			id: input.inventoryVariantId,
			deletedAt: null,
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
		},
		data: { stockAlertsEnabled: input.enabled },
	});
	if (!result.count)
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			"This inventory variant is archived or unavailable.",
		);
	return {
		inventoryVariantId: input.inventoryVariantId,
		enabled: input.enabled,
	};
}

export function effectiveLowStockAlert(
	override: number | null | undefined,
	meta: unknown,
) {
	return override ?? readCategoryStockSettings(meta).lowStockAlert;
}

export async function resolveStockPolicyCategory(
	db: Db | TransactionClient,
	input: z.infer<typeof stockPolicySelectorSchema>,
) {
	let where: Prisma.InventoryCategoryWhereInput;
	if ("categoryId" in input) where = { id: input.categoryId, deletedAt: null };
	else {
		const step = await db.dykeSteps.findFirst({
			where: { id: input.stepId, deletedAt: null },
			select: { uid: true },
		});
		if (!step?.uid)
			throw new StockAdjustmentError(
				"BAD_REQUEST",
				"This step has no active inventory identity. Import the step into Inventory first.",
			);
		where = { uid: step.uid, deletedAt: null };
	}
	const categories = await db.inventoryCategory.findMany({
		where,
		take: 2,
		select: {
			id: true,
			uid: true,
			title: true,
			stockMode: true,
			productKind: true,
			meta: true,
		},
	});
	const category = categories[0];
	if (categories.length !== 1 || !category)
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			categories.length
				? "Multiple active categories match this step. Resolve the duplicate inventory categories first."
				: "No active inventory category matches this step. Import the step into Inventory first.",
		);
	return category;
}
export async function getCategoryStockPolicy(
	db: Db,
	input: z.infer<typeof stockPolicySelectorSchema>,
) {
	const category = await resolveStockPolicyCategory(db, input);
	return {
		categoryId: category.id,
		title: category.title,
		tracked:
			category.stockMode === "monitored" &&
			category.productKind !== "component",
		...readCategoryStockSettings(category.meta),
	};
}
export async function setCategoryStockPolicy(
	db: Db,
	input: z.infer<typeof categoryStockPolicySchema>,
) {
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM InventoryCategory WHERE id = ${input.categoryId} FOR UPDATE`;
			const category = await resolveStockPolicyCategory(tx, {
				categoryId: input.categoryId,
			});
			const meta =
				category.meta &&
				typeof category.meta === "object" &&
				!Array.isArray(category.meta)
					? (category.meta as Record<string, Prisma.JsonValue>)
					: {};
			await tx.inventoryCategory.update({
				where: { id: category.id },
				data: {
					stockMode: input.tracked ? "monitored" : "unmonitored",
					...(input.tracked ? { productKind: "inventory" } : {}),
					meta: {
						...meta,
						stockSettings: {
							piecesPerUnit:
								input.piecesPerUnit ??
								readCategoryStockSettings(meta).piecesPerUnit,
							stockUnit:
								input.stockUnit === undefined
									? readCategoryStockSettings(meta).stockUnit
									: input.stockUnit,
							lowStockAlert: input.lowStockAlert,
							promptAvailableStock: input.promptAvailableStock,
						},
					},
				},
			});
			if (input.tracked)
				await tx.inventory.updateMany({
					where: {
						inventoryCategoryId: category.id,
						deletedAt: null,
						productKind: "component",
					},
					data: { productKind: "inventory" },
				});
			return {
				...input,
				becameTracked:
					input.tracked &&
					(category.stockMode !== "monitored" ||
						category.productKind === "component"),
			};
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}
export async function setVariantStockThreshold(
	db: Db,
	input: z.infer<typeof variantStockThresholdSchema>,
) {
	const variant = await db.inventoryVariant.findFirst({
		where: {
			id: input.inventoryVariantId,
			deletedAt: null,
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
		},
		select: { id: true },
	});
	if (!variant)
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			"This inventory variant is archived or unavailable.",
		);
	return db.inventoryVariant.update({
		where: { id: variant.id },
		data: { lowStockAlert: input.lowStockAlert },
		select: { id: true, lowStockAlert: true },
	});
}
