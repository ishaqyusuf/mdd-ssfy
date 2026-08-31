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

const fulfillmentCalendarDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")
	.refine(
		(value) => {
			const parsed = new Date(`${value}T00:00:00.000Z`);
			return (
				!Number.isNaN(parsed.getTime()) &&
				parsed.toISOString().slice(0, 10) === value
			);
		},
		"Expected a valid calendar date",
	);

export const fulfillmentCalendarSchema = z
	.object({
		from: fulfillmentCalendarDateSchema,
		to: fulfillmentCalendarDateSchema,
	})
	.superRefine((value, ctx) => {
		const from = Date.parse(`${value.from}T00:00:00.000Z`);
		const to = Date.parse(`${value.to}T00:00:00.000Z`);
		const rangeInDays = (to - from) / 86_400_000;

		if (!Number.isFinite(rangeInDays) || rangeInDays < 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Calendar end date must be on or after the start date",
				path: ["to"],
			});
		} else if (rangeInDays > 45) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Calendar ranges cannot exceed 46 days",
				path: ["to"],
			});
		}
	});

export type FulfillmentCalendarInput = z.infer<
	typeof fulfillmentCalendarSchema
>;

export const dispatchBacklogSchema = paginationSchema.extend({
	ids: z.array(z.number().int().positive()).max(50).optional().nullable(),
	deliveryModes: z
		.array(z.enum(["delivery", "pickup"]))
		.optional()
		.nullable(),
});

export type DispatchBacklogInput = z.infer<typeof dispatchBacklogSchema>;

export const createDispatchesSchema = z.object({
	orders: z
		.array(
			z.object({
				salesId: z.number().int().positive(),
				dueDate: z.date(),
			}),
		)
		.min(1)
		.max(50)
		.superRefine((orders, ctx) => {
			const salesIds = new Set<number>();
			for (const [index, order] of orders.entries()) {
				if (salesIds.has(order.salesId)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Each order can appear only once in a dispatch batch",
						path: [index, "salesId"],
					});
				}
				salesIds.add(order.salesId);
			}
		}),
	deliveryMode: z.enum(["delivery", "pickup"]),
	overrideDueDate: z.date().nullable().optional(),
	driverId: z.number().int().positive().nullable().optional(),
});

export const dispatchAssignmentDestinationPreflightSchema = z
	.object({
		dispatchIds: z.array(z.number().int().positive()).max(50).optional(),
		salesIds: z.array(z.number().int().positive()).max(50).optional(),
		deliveryMode: z.enum(["delivery", "pickup"]).optional(),
	})
	.superRefine((value, ctx) => {
		const hasDispatches = Boolean(value.dispatchIds?.length);
		const hasSales = Boolean(value.salesIds?.length);
		if (hasDispatches === hasSales) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Choose dispatches or sales orders for address verification.",
			});
		}
		if (hasSales && !value.deliveryMode) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Delivery mode is required for sales-order verification.",
				path: ["deliveryMode"],
			});
		}
	});

export type DispatchAssignmentDestinationPreflightInput = z.infer<
	typeof dispatchAssignmentDestinationPreflightSchema
>;

export const normalizeDispatchAssignmentDestinationSchema = z
	.object({
		salesId: z.number().int().positive(),
		placeId: z.string().trim().min(3).max(255),
		sessionToken: z.string().uuid().optional(),
	})
	.strict();

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
