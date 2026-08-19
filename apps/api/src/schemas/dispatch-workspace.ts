import { dispatchExceptionReasonCodes } from "@gnd/sales/dispatch-manifest/exceptions";
import { dispatchWorkspaceStages } from "@gnd/sales/dispatch-manifest/status";
import {
	dispatchRiskCodes,
	dispatchWorkspaceSections,
} from "@gnd/sales/dispatch-manifest/workspace";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const dispatchWorkspaceSectionSchema = z.enum(dispatchWorkspaceSections);

export const dispatchWorkspaceListSchema = paginationSchema.extend({
	section: dispatchWorkspaceSectionSchema.optional().default("dispatches"),
	stages: z.array(z.enum(dispatchWorkspaceStages)).optional().nullable(),
	driversId: z.array(z.number().int().positive()).optional().nullable(),
	dueBuckets: z
		.array(z.enum(["overdue", "today", "tomorrow", "upcoming", "unscheduled"]))
		.optional()
		.nullable(),
	deliveryModes: z
		.array(z.enum(["delivery", "pickup"]))
		.optional()
		.nullable(),
	risks: z.array(z.enum(dispatchRiskCodes)).optional().nullable(),
	scheduleRange: z.array(z.string()).max(2).optional().nullable(),
});

export type DispatchWorkspaceListInput = z.infer<
	typeof dispatchWorkspaceListSchema
>;

export const dispatchBacklogSchema = paginationSchema.extend({
	deliveryModes: z
		.array(z.enum(["delivery", "pickup"]))
		.optional()
		.nullable(),
});

export type DispatchBacklogInput = z.infer<typeof dispatchBacklogSchema>;

export const dispatchExceptionListSchema = paginationSchema.extend({
	status: z.enum(["open", "resolved"]).optional().default("open"),
	reasonCodes: z
		.array(z.enum(dispatchExceptionReasonCodes))
		.optional()
		.nullable(),
	driversId: z.array(z.number().int().positive()).optional().nullable(),
});

export type DispatchExceptionListInput = z.infer<
	typeof dispatchExceptionListSchema
>;

export const reportDispatchExceptionSchema = z.object({
	dispatchId: z.number().int().positive(),
	reasonCode: z.enum(dispatchExceptionReasonCodes),
	notes: z.string().trim().max(2_000).optional().nullable(),
	requestId: z.string().uuid(),
});

export type ReportDispatchExceptionInput = z.infer<
	typeof reportDispatchExceptionSchema
>;

export const resolveDispatchExceptionSchema = z.object({
	exceptionId: z.number().int().positive(),
	resolutionNote: z.string().trim().min(3).max(2_000),
	tripAction: z.literal("keep_assigned").default("keep_assigned"),
});

export type ResolveDispatchExceptionInput = z.infer<
	typeof resolveDispatchExceptionSchema
>;

export const dispatchWorkspaceDetailSchema = z.object({
	dispatchId: z.number().int().positive(),
});
