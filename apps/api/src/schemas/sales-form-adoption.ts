import { z } from "zod";

export const salesFormUsageSchema = z.object({
	surface: z.enum(["new", "legacy"]),
	type: z.enum(["order", "quote"]),
	mode: z.enum(["create", "edit"]),
});

export const salesFormAdoptionSchema = z.object({
	days: z.number().int().min(1).max(90).default(30),
});

export type SalesFormUsageInput = z.infer<typeof salesFormUsageSchema>;
export type SalesFormAdoptionInput = z.infer<typeof salesFormAdoptionSchema>;
