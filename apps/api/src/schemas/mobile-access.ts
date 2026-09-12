import { z } from "zod";

export const mobileAccessPlatformSchema = z.enum(["ANDROID", "IOS"]);
export const mobileAccessRequestStatusSchema = z.enum([
	"REQUESTED",
	"APPROVED",
	"INVITED",
	"ACCEPTED",
	"INSTALLED",
	"REJECTED",
	"CANCELLED",
]);

const optionalNote = z
	.string()
	.trim()
	.max(500)
	.optional()
	.transform((value) => value || undefined);

export const requestMobileAccessSchema = z.object({
	platform: mobileAccessPlatformSchema,
	employeeNote: optionalNote,
});

export const updateMobileAccessRequestSchema = z.object({
	id: z.number().int().positive(),
	status: z.enum([
		"APPROVED",
		"INVITED",
		"ACCEPTED",
		"INSTALLED",
		"REJECTED",
		"CANCELLED",
	]),
	statusNote: optionalNote,
	internalNote: optionalNote,
	externalReference: z
		.string()
		.trim()
		.max(255)
		.optional()
		.transform((value) => value || undefined),
});

export type MobileAccessPlatform = z.infer<typeof mobileAccessPlatformSchema>;
export type MobileAccessRequestStatus = z.infer<
	typeof mobileAccessRequestStatusSchema
>;
export type RequestMobileAccessInput = z.infer<
	typeof requestMobileAccessSchema
>;
export type UpdateMobileAccessRequestInput = z.infer<
	typeof updateMobileAccessRequestSchema
>;
