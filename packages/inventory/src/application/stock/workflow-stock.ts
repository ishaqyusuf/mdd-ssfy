import type { Db } from "@gnd/db";
import { z } from "zod";
import {
	effectiveLowStockAlert,
	resolveStockPolicyCategory,
} from "./stock-policy";
import { readCategoryStockSettings } from "./stock-settings";
import { summarizeStockVariants } from "./stock-status";

export const workflowStockSchema = z.object({
	stepId: z.number().int().positive(),
	componentUids: z.array(z.string().trim().min(1).max(120)).max(300),
	includeVariants: z.boolean().optional().default(true),
});
export function stockAvailability(physical: number, committed: number) {
	return Math.max(0, physical - committed);
}
export function stockLevel(available: number, threshold: number) {
	return available <= 0
		? "out_of_stock"
		: available <= threshold
			? "low_stock"
			: "available";
}
export async function getWorkflowStock(
	db: Db,
	input: z.input<typeof workflowStockSchema>,
) {
	const category = await resolveStockPolicyCategory(db, {
		stepId: input.stepId,
	});
	const tracked =
		category.stockMode === "monitored" && category.productKind !== "component";
	if (!tracked || !input.componentUids.length)
		return {
			tracked,
			categoryId: category.id,
			stockUnit: readCategoryStockSettings(category.meta).stockUnit,
			components: [],
		};
	const uids = Array.from(new Set(input.componentUids));
	const inventories = await db.inventory.findMany({
		where: {
			inventoryCategoryId: category.id,
			deletedAt: null,
			OR: [{ sourceComponentUid: { in: uids } }, { uid: { in: uids } }],
		},
		take: 601,
		select: {
			id: true,
			uid: true,
			sourceComponentUid: true,
			productKind: true,
			variants: {
				where: { deletedAt: null },
				take: 101,
				orderBy: { id: "asc" },
				select: {
					id: true,
					uid: true,
					sku: true,
					description: true,
					lowStockAlert: true,
					stockAlertsEnabled: true,
					attributes: {
						where: { deletedAt: null },
						take: input.includeVariants === false ? 0 : 20,
						select: { value: { select: { name: true } } },
					},
					stocks: {
						where: { deletedAt: null },
						select: { id: true, qty: true },
					},
				},
			},
		},
	});
	const variantIds = inventories.flatMap((inventory) =>
		inventory.variants.map((variant) => variant.id),
	);
	const allocations = variantIds.length
		? await db.stockAllocation.groupBy({
				by: ["inventoryVariantId", "inventoryStockId", "status"],
				where: {
					inventoryVariantId: { in: variantIds },
					deletedAt: null,
					inventoryStockId: { not: null },
					status: {
						in: [
							"pending_review",
							"approved",
							"reserved",
							"picked",
							"consumed",
						],
					},
				},
				_sum: { qty: true },
			})
		: [];
	return {
		tracked,
		categoryId: category.id,
		stockUnit: readCategoryStockSettings(category.meta).stockUnit,
		components: uids.map((uid) => {
			const matches = inventories.filter(
				(inventory) => (inventory.sourceComponentUid || inventory.uid) === uid,
			);
			const inventory = matches.length === 1 ? matches[0] : null;
			if (
				!inventory ||
				inventory.variants.length > 100 ||
				inventory.productKind === "component"
			)
				return {
					uid,
					mapped: false,
					inventoryId: null,
					variantCount: 0,
					status: null,
					variants: [],
				};
			const variants = inventory.variants.map((variant) => {
				const balances = variant.stocks.map((stock) => {
					const rows = allocations.filter(
						(row) => row.inventoryStockId === stock.id,
					);
					const committed = rows
						.filter((row) => row.status !== "pending_review")
						.reduce((qty, row) => qty + Number(row._sum.qty || 0), 0);
					const pendingReview = rows
						.filter((row) => row.status === "pending_review")
						.reduce((qty, row) => qty + Number(row._sum.qty || 0), 0);
					return {
						physical: stock.qty,
						committed,
						pendingReview,
						available: stockAvailability(stock.qty, committed),
					};
				});
				const physical = balances.reduce((qty, row) => qty + row.physical, 0);
				const committed = balances.reduce((qty, row) => qty + row.committed, 0);
				const pendingReview = balances.reduce(
					(qty, row) => qty + row.pendingReview,
					0,
				);
				const available = balances.reduce((qty, row) => qty + row.available, 0);
				const threshold = effectiveLowStockAlert(
					variant.lowStockAlert,
					category.meta,
				);
				return {
					id: variant.id,
					uid: variant.uid,
					alertsEnabled: variant.stockAlertsEnabled !== false,
					label:
						variant.sku ||
						variant.description ||
						variant.uid
							?.replace(/^w(\d+)_(\d+)-h(\d+)_(\d+)$/i, "$1-$2 × $3-$4")
							.match(/^\d+-\d+ × \d+-\d+$/)?.[0] ||
						[
							...new Set(
								variant.attributes?.flatMap((attribute) =>
									attribute.value?.name ? [attribute.value.name] : [],
								) ?? [],
							),
						].join(" · ") ||
						`Variant ${variant.id}`,
					physical,
					committed,
					pendingReview,
					available,
					threshold,
					level: stockLevel(available, threshold),
				};
			});
			return {
				uid,
				mapped: variants.length > 0,
				inventoryId: inventory.id,
				variantCount: variants.length,
				status: variants.length ? summarizeStockVariants(variants) : null,
				variants: input.includeVariants === false ? [] : variants,
			};
		}),
	};
}
