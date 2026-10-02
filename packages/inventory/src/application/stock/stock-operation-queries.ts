import type { Db } from "@gnd/db";
import type { z } from "zod";
import type { stockVariantOptionsSchema } from "./stock-operation-schema";
import { readCategoryStockSettings } from "./stock-policy";

export async function getStockVariantOptions(
	db: Db,
	input: z.infer<typeof stockVariantOptionsSchema>,
) {
	const rows = await db.inventoryVariant.findMany({
		where: {
			deletedAt: null,
			...(input.inventoryId ? { inventoryId: input.inventoryId } : {}),
			...(input.inventoryVariantId ? { id: input.inventoryVariantId } : {}),
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
			...(input.q
				? {
						OR: [
							{ sku: { contains: input.q } },
							{ description: { contains: input.q } },
							{ inventory: { name: { contains: input.q } } },
						],
					}
				: {}),
		},
		orderBy: [{ inventory: { name: "asc" } }, { id: "asc" }],
		take: input.take,
		select: {
			id: true,
			uid: true,
			attributes: {
				where: { deletedAt: null },
				select: { value: { select: { name: true } } },
			},
			sku: true,
			description: true,
			inventory: {
				select: { name: true, inventoryCategory: { select: { title: true } } },
			},
		},
	});
	return rows.map((row) => ({
		id: String(row.id),
		label: [
			row.inventory.name,
			row.sku,
			row.description ||
				row.uid
					.replace(/^w(\d+)_(\d+)-h(\d+)_(\d+)$/i, "$1-$2 x $3-$4")
					.match(/^\d+-\d+ x \d+-\d+$/)?.[0] ||
				[
					...new Set(
						row.attributes.flatMap((attribute) =>
							attribute.value?.name ? [attribute.value.name] : [],
						),
					),
				].join(" · "),
		]
			.filter(Boolean)
			.join(" · "),
		category: row.inventory.inventoryCategory?.title ?? null,
	}));
}

export async function getStockVariantContext(
	db: Db,
	inventoryVariantId: number,
) {
	const variant = await db.inventoryVariant.findFirstOrThrow({
		where: {
			id: inventoryVariantId,
			deletedAt: null,
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
		},
		select: {
			id: true,
			uid: true,
			sku: true,
			description: true,
			lowStockAlert: true,
			inventoryId: true,
			inventory: {
				select: {
					name: true,
					defaultSupplierId: true,
					inventoryCategory: { select: { id: true, meta: true } },
				},
			},
			stocks: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				select: {
					id: true,
					qty: true,
					price: true,
					location: true,
					supplierId: true,
					supplier: { select: { name: true } },
				},
			},
		},
	});
	const allocated = await getStockCommitments(
		db,
		variant.stocks.map((stock) => stock.id),
		true,
	);
	const duplicates = await db.inventoryVariant.findMany({
		where: {
			id: { not: variant.id },
			uid: variant.uid,
			inventoryId: variant.inventoryId,
			deletedAt: null,
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
		},
		take: 10,
		select: {
			id: true,
			inventoryId: true,
			inventory: { select: { name: true } },
		},
	});
	return {
		...variant,
		stocks: variant.stocks.map((stock) => ({
			...stock,
			allocatedQty: allocated.get(stock.id) ?? 0,
		})),
		stockUnit: readCategoryStockSettings(
			variant.inventory.inventoryCategory?.meta,
		).stockUnit,
		identityWarnings: duplicates.length
			? [
					"This product has duplicate selections. Review the catalog before combining physical counts.",
				]
			: [],
	};
}

/** Exact variants only; reserved pieces are never offered as free warehouse stock. */
export async function getStockVariantBalances(
	db: Db,
	inventoryVariantIds: number[],
) {
	const images = {
		where: { deletedAt: null, imageGallery: { deletedAt: null } },
		orderBy: [
			{ primary: "desc" as const },
			{ position: "asc" as const },
			{ id: "asc" as const },
		],
		take: 1,
		select: {
			imageGallery: { select: { path: true, bucket: true, provider: true } },
		},
	};
	const variants = await db.inventoryVariant.findMany({
		where: {
			id: { in: inventoryVariantIds },
			deletedAt: null,
			inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
		},
		select: {
			id: true,
			img: true,
			images,
			inventory: { select: { img: true, images } },
			stocks: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				select: {
					id: true,
					qty: true,
					location: true,
					supplier: { select: { name: true } },
				},
			},
		},
	});
	const stockIds = variants.flatMap((variant) =>
		variant.stocks.map((stock) => stock.id),
	);
	const reserved = await getStockCommitments(db, stockIds);
	return variants.map((variant) => {
		const stocks = variant.stocks.map((stock) => ({
			...stock,
			reservedQty: reserved.get(stock.id) ?? 0,
			availableQty: Math.max(0, stock.qty - (reserved.get(stock.id) ?? 0)),
		}));
		return {
			id: variant.id,
			image:
				variant.images[0]?.imageGallery ??
				variant.inventory.images[0]?.imageGallery ??
				null,
			imageUrl: variant.img ?? variant.inventory.img,
			stocks,
			qty: stocks.reduce((sum, row) => sum + row.qty, 0),
			reservedQty: stocks.reduce((sum, row) => sum + row.reservedQty, 0),
			availableQty: stocks.reduce((sum, row) => sum + row.availableQty, 0),
		};
	});
}

async function getStockCommitments(
	db: Db,
	stockIds: number[],
	includeReview = false,
) {
	const allocations = stockIds.length
		? await db.stockAllocation.groupBy({
				by: ["inventoryStockId"],
				where: {
					inventoryStockId: { in: stockIds },
					deletedAt: null,
					status: {
						in: [
							...(includeReview ? ["pending_review" as const] : []),
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
	return new Map(
		allocations.map((row) => [row.inventoryStockId, row._sum.qty ?? 0]),
	);
}
