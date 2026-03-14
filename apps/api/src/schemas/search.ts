import { z } from "zod";

export const globalSearchSourceNames = [
	"sales",
	"quotes",
	"dispatch",
	"employees",
	"customers",
	"projects",
	"units",
	"templates",
	"builders",
] as const;

export const globalSearchSourceSchema = z.enum(globalSearchSourceNames);
export type GlobalSearchSource = z.infer<typeof globalSearchSourceSchema>;

export const globalSearchSchema = z.object({
	searchTerm: z.string().nullable().optional(),
	sources: z.array(globalSearchSourceSchema).optional().nullable(),
	limit: z.number().int().positive().max(100).optional().nullable(),
});
export type GlobalSearchSchema = z.infer<typeof globalSearchSchema>;
