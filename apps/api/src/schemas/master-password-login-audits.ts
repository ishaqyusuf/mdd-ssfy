import { z } from "zod";

export const masterPasswordLoginAuditPlatformSchema = z.enum([
	"WEBSITE",
	"MOBILE",
	"UNKNOWN",
]);

export const masterPasswordUsageTypeSchema = z.enum([
	"LOGIN",
	"SALES_REP_TRANSFER",
]);

export const listMasterPasswordLoginAuditsSchema = z.object({
	page: z.number().int().min(1).optional(),
	size: z.number().int().min(1).max(100).optional(),
	q: z.string().optional(),
	platform: masterPasswordLoginAuditPlatformSchema.optional(),
	usageType: masterPasswordUsageTypeSchema.optional(),
	includeCleared: z.boolean().optional(),
});

export const clearMasterPasswordLoginAuditsSchema = z.object({
	ids: z.array(z.string().min(1)).max(100).optional(),
	q: z.string().optional(),
	platform: masterPasswordLoginAuditPlatformSchema.optional(),
	usageType: masterPasswordUsageTypeSchema.optional(),
});

export type ListMasterPasswordLoginAuditsInput = z.infer<
	typeof listMasterPasswordLoginAuditsSchema
>;
export type ClearMasterPasswordLoginAuditsInput = z.infer<
	typeof clearMasterPasswordLoginAuditsSchema
>;
