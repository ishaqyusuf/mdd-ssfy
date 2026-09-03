import { dispatchWorkspaceStages } from "@gnd/sales/dispatch-manifest/status";
import { dispatchRiskCodes } from "@gnd/sales/dispatch-manifest/workspace";
import { salesDispatchStatus } from "@gnd/utils/constants";
import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
	inboundFilterStatus,
	salesType,
} from "@gnd/utils/constants";
import { paginationSchema } from "@gnd/utils/schema";
import {
	SALES_CHANNEL_FILTER_OPTIONS,
	SALES_HAS_FILTER_OPTIONS,
	SALES_INBOUND_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_SHOW_OPTIONS,
} from "@sales/filter-constants";
import { SALES_ORDER_LIFECYCLE_STATUSES } from "@sales/order-status";
import { salesPrioritySchema } from "@sales/priority";
import { salesCompletionSatisfactionFilterSchema } from "@sales/sales-completion";
import { z } from "zod";

export const dispatchDueBucketSchema = z.enum([
	"overdue",
	"today",
	"tomorrow",
	"upcoming",
	"unscheduled",
]);

const dispatchQueryParamsShape = {
	tab: z.enum(["all", "pending", "completed"]).optional().nullable(),
	driversId: z.array(z.number()).optional().nullable(),
	status: z.enum(salesDispatchStatus).optional().nullable(),
	stages: z.array(z.enum(dispatchWorkspaceStages)).optional().nullable(),
	dueBuckets: z.array(dispatchDueBucketSchema).optional().nullable(),
	deliveryModes: z
		.array(z.enum(["delivery", "pickup"]))
		.optional()
		.nullable(),
	scheduleRange: z.array(z.string()).max(2).optional().nullable(),
	risks: z.array(z.enum(dispatchRiskCodes)).optional().nullable(),
	scheduleDate: z.array(z.string().optional().nullable()).optional().nullable(),
};

export const dispatchQueryParamsSchema = z
	.object(dispatchQueryParamsShape)
	.extend(paginationSchema.shape);
export type DispatchQueryParamsSchema = z.infer<
	typeof dispatchQueryParamsSchema
>;

export const driverWorkQueueQuerySchema = dispatchQueryParamsSchema.extend({
	statuses: z.array(z.enum(salesDispatchStatus)).optional().nullable(),
});
export type DriverWorkQueueQuerySchema = z.infer<
	typeof driverWorkQueueQuerySchema
>;

export const updateSalesDeliveryOptionSchema = z.object({
	deliveryId: z.number().nullable().optional(),
	salesId: z.number(),
	driverId: z.number().nullable().optional(),
	option: z.string().nullable().optional(),
	defaultOption: z.string().nullable().optional(),
	date: z.date().nullable().optional(),
});
export type UpdateSalesDeliveryOptionSchema = z.infer<
	typeof updateSalesDeliveryOptionSchema
>;

export const dispatchStatusSchema = z.enum([
	"queue",
	"packing queue",
	"missing items",
	"packed",
	"in progress",
	"completed",
	"cancelled",
]);
export type DispatchStatusSchema = z.infer<typeof dispatchStatusSchema>;

export const updateDispatchDriverSchema = z.object({
	dispatchId: z.number(),
	oldDriverId: z.number().nullable().optional(),
	newDriverId: z.number().nullable().optional(),
});
export type UpdateDispatchDriverSchema = z.infer<
	typeof updateDispatchDriverSchema
>;

export const updateDispatchDueDateSchema = z.object({
	dispatchId: z.number(),
	oldDueDate: z.date().nullable().optional(),
	newDueDate: z.date(),
});
export type UpdateDispatchDueDateSchema = z.infer<
	typeof updateDispatchDueDateSchema
>;

export const completionModeSchema = z.enum(["packed_only", "complete_all"]);
export type CompletionModeSchema = z.infer<typeof completionModeSchema>;

export const updateDispatchStatusSchema = z.object({
	dispatchId: z.number(),
	oldStatus: dispatchStatusSchema,
	newStatus: dispatchStatusSchema,
	completionMode: completionModeSchema.optional(),
});
export type UpdateDispatchStatusSchema = z.infer<
	typeof updateDispatchStatusSchema
>;

export const resolveDuplicateDispatchGroupSchema = z.object({
	salesId: z.number(),
	keepDispatchId: z.number(),
	deleteDispatchIds: z.array(z.number()).min(1),
});
export type ResolveDuplicateDispatchGroupSchema = z.infer<
	typeof resolveDuplicateDispatchGroupSchema
>;

export const salesQueryParamsSchema = z
	.object({
		salesNo: z.string().optional().nullable(),
		salesNos: z.array(z.string()).optional().nullable(),
		dateRange: z.array(z.string()).optional().nullable(),
		salesIds: z.array(z.number()).optional().nullable(),
		"address.id": z.number().optional().nullable(),
		salesType: z.enum(salesType).optional().nullable(),
		"customer.name": z.string().optional().nullable(),
		phone: z.string().optional().nullable(),
		defaultSearch: z.boolean().optional().nullable(),
		po: z.string().optional().nullable(),
		item: z.string().optional().nullable(),
		lifecycle: z
			.array(z.enum(SALES_ORDER_LIFECYCLE_STATUSES))
			.max(SALES_ORDER_LIFECYCLE_STATUSES.length)
			.optional()
			.nullable(),
		salesRepId: z.number().optional().nullable(),
		"sales.rep": z.string().optional().nullable(),
		orderNo: z.string().optional().nullable(),
		"dispatch.status": z
			.enum(SALES_DISPATCH_FILTER_OPTIONS)
			.optional()
			.nullable(),
		"completion.production": salesCompletionSatisfactionFilterSchema
			.optional()
			.nullable(),
		"completion.fulfillment": salesCompletionSatisfactionFilterSchema
			.optional()
			.nullable(),
		"production.dueDate": z.array(z.any()).optional().nullable(),
		"production.status": z.enum(PRODUCTION_STATUS).optional().nullable(),
		"production.assignment": z
			.enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
			.optional()
			.nullable(),
		"sales.priority": salesPrioritySchema.optional().nullable(),
		priority: salesPrioritySchema.optional().nullable(),
		has: z.enum(SALES_HAS_FILTER_OPTIONS).optional().nullable(),
		salesChannel: z.enum(SALES_CHANNEL_FILTER_OPTIONS).optional().nullable(),
		inbound: z.enum(SALES_INBOUND_FILTER_OPTIONS).optional().nullable(),
		specialOrderScope: z
			.enum(SALES_SPECIAL_ORDER_SHOW_OPTIONS)
			.optional()
			.nullable(),
		specialOrder: z
			.enum(SALES_SPECIAL_ORDER_FILTER_OPTIONS)
			.optional()
			.nullable(),
		archiveScope: z.enum(["archived"]).optional().nullable(),
		invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
		paymentReview: z.enum(["needs_review"]).optional().nullable(),
		needsAction: z.enum(["open"]).optional().nullable(),
		production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
		showing: z.enum(["all sales"]).optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const setSalesOrdersArchivedSchema = z
	.object({
		salesIds: z.array(z.number().int().positive()).min(1).max(100),
		archived: z.boolean(),
	})
	.refine((input) => new Set(input.salesIds).size === input.salesIds.length, {
		message: "Each Sales Order can only be selected once.",
		path: ["salesIds"],
	});
export type SetSalesOrdersArchivedSchema = z.infer<
	typeof setSalesOrdersArchivedSchema
>;

export const getSaleOverviewSchema = z.object({
	orderNo: z.string().optional().nullable(),
	salesType: z.enum(salesType).optional().nullable(),
});
export type GetSaleOverviewSchema = z.infer<typeof getSaleOverviewSchema>;

export const updateSalesPaymentMethodSchema = z.object({
	salesId: z.number(),
	paymentMethod: z.string().trim().min(1).max(64),
});
export type UpdateSalesPaymentMethodSchema = z.infer<
	typeof updateSalesPaymentMethodSchema
>;

export const transferSalesRepSchema = z.object({
	salesId: z.number().int().positive(),
	salesRepId: z.number().int().positive(),
	reason: z.string().trim().max(500).optional().nullable(),
	password: z.string().min(1).max(256),
});
export type TransferSalesRepSchema = z.infer<typeof transferSalesRepSchema>;

export const salesRepOptionsSchema = z
	.object({
		salesId: z.number().int().positive().optional().nullable(),
	})
	.optional();
export type SalesRepOptionsSchema = z.infer<typeof salesRepOptionsSchema>;

export const inboundQuerySchema = z
	.object({
		status: z.enum(inboundFilterStatus).optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type InboundQuerySchema = z.infer<typeof inboundQuerySchema>;

export const startNewSalesSchema = z.object({
	customerId: z.number().optional().nullable(),
});

export type StartNewSalesSchema = z.infer<typeof startNewSalesSchema>;
export const salesMutationTypeSchema = z.enum(["order", "quote"]);
export type SalesMutationTypeSchema = z.infer<typeof salesMutationTypeSchema>;

export const copySaleSchema = z.object({
	salesUid: z.string(),
	as: salesMutationTypeSchema,
	type: salesMutationTypeSchema,
});
export type CopySaleSchema = z.infer<typeof copySaleSchema>;

export const moveSaleSchema = z
	.object({
		salesUid: z.string(),
		to: salesMutationTypeSchema,
		type: salesMutationTypeSchema,
	})
	.refine((data) => data.to !== data.type, {
		message: "Destination type must differ from source type",
		path: ["to"],
	});
export type MoveSaleSchema = z.infer<typeof moveSaleSchema>;

export const deleteSalesByOrderIdsSchema = z.object({
	orderIds: z.array(z.string()).min(1),
});
export type DeleteSalesByOrderIdsSchema = z.infer<
	typeof deleteSalesByOrderIdsSchema
>;
export const getFullSalesDataSchema = z.object({
	salesId: z.number().optional().nullable(),
	salesNo: z.string().optional().nullable(),
	assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
export const saveOrderProductionGateSchema = z
	.object({
		salesOrderId: z.number(),
		ruleType: z.enum(["fully_paid", "half_paid", "lead_time_before_delivery"]),
		leadTimeValue: z.number().nullable().optional(),
		leadTimeUnit: z.enum(["day", "week"]).nullable().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.ruleType !== "lead_time_before_delivery") return;
		if (!data.leadTimeValue || data.leadTimeValue <= 0) {
			ctx.addIssue({
				path: ["leadTimeValue"],
				code: "custom",
				message: "Lead time is required",
			});
		}
		if (!data.leadTimeUnit) {
			ctx.addIssue({
				path: ["leadTimeUnit"],
				code: "custom",
				message: "Lead time unit is required",
			});
		}
	});
export type SaveOrderProductionGateSchema = z.infer<
	typeof saveOrderProductionGateSchema
>;
export const salesDispatchOverviewSchema = z
	.object({
		driverId: z.number().nullable().optional(),
		dispatchId: z.number().nullable().optional(),
	})
	.extend(getFullSalesDataSchema.shape);
export type SalesDispatchOverviewSchema = z.infer<
	typeof salesDispatchOverviewSchema
>;

export const sendSaleForPickupSchema = z.object({
	salesId: z.number(),
});
export type SendSaleForPickupSchema = z.infer<typeof sendSaleForPickupSchema>;

export const packingListTabSchema = z.enum([
	"current",
	"completed",
	"cancelled",
]);
export type PackingListTabSchema = z.infer<typeof packingListTabSchema>;

export const packingListQuerySchema = z.object({
	tab: packingListTabSchema.optional().default("current"),
});
export type PackingListQuerySchema = z.infer<typeof packingListQuerySchema>;

export const signPackingSlipSchema = z.object({
	dispatchId: z.number(),
	receivedBy: z.string().optional().nullable(),
	signature: z
		.string()
		.min(1)
		.max(5_400_100)
		.regex(
			/^data:image\/png;base64,[A-Za-z0-9+/]*={0,2}$/,
			"Packing signature must be a PNG data URL.",
		),
	note: z.string().optional().nullable(),
	noteType: z.enum(["dispatch", "pickup"]).optional().nullable(),
});
export type SignPackingSlipSchema = z.infer<typeof signPackingSlipSchema>;

export const enlistDispatchItemSchema = z.object({
	dispatchId: z.number(),
	submissions: z.array(z.object({})),
});

export const bulkAssignDriverSchema = z.object({
	dispatchIds: z.array(z.number()).min(1),
	newDriverId: z.number().nullable(),
});
export type BulkAssignDriverSchema = z.infer<typeof bulkAssignDriverSchema>;

export const bulkCancelDispatchSchema = z.object({
	dispatchIds: z.array(z.number()).min(1),
	allowPickedRelease: z.boolean().optional().default(false),
});
export type BulkCancelDispatchSchema = z.infer<typeof bulkCancelDispatchSchema>;

export const exportDispatchesSchema = z.object({
	...dispatchQueryParamsShape,
	sort: paginationSchema.shape.sort,
	q: paginationSchema.shape.q,
	bin: paginationSchema.shape.bin,
});
export type ExportDispatchesSchema = z.infer<typeof exportDispatchesSchema>;
