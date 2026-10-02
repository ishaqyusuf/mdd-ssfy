import { z } from "zod";

const positiveId = z.number().int().positive();

export const stockVariantBalancesSchema = z.object({
	inventoryVariantIds: z.array(positiveId).min(1).max(2000),
});

export const stockVariantOptionsSchema = z.object({
	inventoryId: positiveId.optional(),
	inventoryVariantId: positiveId.optional(),
	q: z.string().trim().max(120).default(""),
	take: z.number().int().min(1).max(30).default(20),
});

export const stockVariantContextSchema = z.object({
	inventoryVariantId: positiveId,
});

export const manualStockAdjustmentSchema = z.object({
	inventoryVariantId: positiveId,
	inventoryStockId: positiveId.nullish(),
	supplierId: positiveId.nullish(),
	location: z.string().trim().max(120).nullish(),
	unitPrice: z.number().finite().nonnegative().nullish(),
	qty: z.number().finite(),
	expectedQty: z.number().finite().nonnegative(),
	mode: z.enum(["delta", "set"]).default("delta"),
	reason: z.enum([
		"correction",
		"cycle_count",
		"damage",
		"return",
		"consume",
		"release",
		"stock_in",
		"stock_out",
	]),
	reference: z.string().trim().max(200).nullish(),
	notes: z.string().trim().max(2000).nullish(),
	openingCount: z.boolean().optional(),
});
