import { z } from "zod";

export const assistantSalesPdfModes = [
	"invoice",
	"quote",
	"packing-slip",
	"production",
	"order-packing",
] as const;

export const assistantSalesPdfModeSchema = z.enum(assistantSalesPdfModes);

export type AssistantSalesPdfMode = z.infer<
	typeof assistantSalesPdfModeSchema
>;
