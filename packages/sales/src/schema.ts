import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
	salesType,
} from "@gnd/utils/constants";
import { paginationSchema } from "@gnd/utils/schema";
import { id } from "date-fns/locale";
import { z } from "zod";
import {
	INVENTORY_STATUS,
	SALES_PAYMENT_METHODS,
	SALES_REFUND_METHODS,
	type SalesProductionStatusFilter,
} from "./constants";
import {
	SALES_CHANNEL_FILTER_OPTIONS,
	SALES_HAS_FILTER_OPTIONS,
	SALES_INBOUND_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_SHOW_OPTIONS,
} from "./filter-constants";
import { salesPrioritySchema } from "./priority";
import { salesCompletionSatisfactionFilterSchema } from "./sales-completion";
import { SALES_DISPATCH_STATUS } from "./utils/constants";
export const getFullSalesDataSchema = z.object({
	salesId: z.number().optional().nullable(),
	salesNo: z.string().optional().nullable(),
	assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
const qty = z.object({
	lh: z.number().nullable().optional(),
	rh: z.number().nullable().optional(),
	qty: z.number().nullable().optional(),
});
export const getStoreAddonComponentFormSchema = z.object({
	inventoryId: z.number(),
});
export type GetStoreAddonComponentForm = z.infer<
	typeof getStoreAddonComponentFormSchema
>;
export const resetSalesControlSchema = z.object({
	meta: z.object({
		salesId: z.number(),
		authorId: z.number(),
		authorName: z.string(),
	}),
});
export type ResetSalesControl = z.infer<typeof resetSalesControlSchema>;

export const dispatchForm = z.object({
	dispatchId: z.number().optional().nullable(),
	receivedBy: z.string().optional().nullable(),
	receivedDate: z.date().optional().nullable(),
	note: z.string().optional(),
	noteType: z.enum(["dispatch", "pickup"]).optional().nullable(),
	signature: z.string().optional().nullable(),
	completionRequestId: z.string().min(12).max(100).optional().nullable(),
	attachments: z
		.array(
			z.object({
				pathname: z.string(),
			}),
		)
		.optional()
		.nullable(),
});
export const updateSalesControlSchema = z.object({
	meta: z.object({
		salesId: z.number(),
		authorId: z.number(),
		authorName: z.string(),
		allowProductionSubmissionForOthers: z.boolean().optional(),
	}),
	cancelDispatch: z
		.object({
			dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
			dispatchIds: z.array(z.number()).optional().nullable(),
			confirmPickedInventoryReturned: z.boolean().optional().default(false),
		})
		.nullable()
		.optional(),
	startDispatch: z
		.object({
			dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
		})
		.nullable()
		.optional(),
	clearPackings: z
		.object({
			dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
		})
		.nullable()
		.optional(),

	deleteSubmissions: z
		.object({
			submissionIds: z.array(z.number()).optional().nullable(),
			itemIds: z.array(z.number()).optional().nullable(),
			itemControlUids: z.array(z.string()).optional().nullable(),
			allBySalesId: z.number().optional().nullable(),
			automaticCompletionSalesId: z.number().optional().nullable(),
		})
		.optional()
		.nullable(),
	updateSubmissions: z
		.object({
			submissions: z
				.array(
					z.object({
						submissionId: z.number(),
						note: z.string().optional().nullable(),
						qty: qty.optional().nullable(),
					}),
				)
				.optional()
				.nullable(),
		})
		.optional()
		.nullable(),
	deleteAssignments: z
		.object({
			assignmentIds: z.array(z.number()).optional().nullable(),
			itemIds: z.array(z.number()).optional().nullable(),
			itemControlUids: z.array(z.string()).optional().nullable(),
			allBySalesId: z.number().optional().nullable(),
		})
		.optional()
		.nullable(),
	createAssignments: z
		.object({
			retries: z.number().optional().nullable().default(0),
			dueDate: z.date().optional().nullable(),
			assignedToId: z.number().nullable().optional(),
			selections: z
				.array(
					z.object({
						uid: z.string(),
						qty: qty.optional().nullable(),
					}),
				)
				.optional()
				.nullable(),
		})
		.optional()
		.nullable(),
	submitAll: z
		.object({
			assignedToId: z.number().nullable().optional(),
			idempotencyKey: z.string().min(1).max(128).optional().nullable(),
			itemUids: z.array(z.string()).optional().nullable(),
			submissionSource: z
				.enum(["sales_mark_as_completed"])
				.optional()
				.nullable(),
			selections: z
				.array(
					z.object({
						assignmentId: z.number(),
						qty: qty.optional().nullable(),
					}),
				)
				.optional()
				.nullable(),
		})
		.nullable()
		.optional(),
	packItems: z
		.object({
			dispatchId: z.number(),
			dispatchStatus: z.enum(SALES_DISPATCH_STATUS),
			replaceExisting: z.boolean().optional().nullable(),
			requestedItems: z
				.array(
					z.object({
						salesItemId: z.number(),
						itemUid: z.string().optional(),
						title: z.string().optional(),
						qty: qty,
						note: z.string().optional(),
					}),
				)
				.nullable()
				.optional(),
			packingLines: z
				.array(
					z.object({
						salesItemId: z.number(),
						submissionId: z.number(),
						qty: qty,
						note: z.string().optional(),
					}),
				)
				.nullable()
				.optional(),
			packingList: z
				.array(
					z.object({
						salesItemId: z.number(),
						// itemControlUid: z.string(),
						submissions: z.array(
							z.object({
								submissionId: z.number(),
								qty: qty,
							}),
						),
						note: z.string().optional(),
					}),
				)
				.nullable()
				.optional(),
			// packAll: z.boolean().optional().nullable(),
			packMode: z
				.enum(["all", "available", "selection"])
				.optional()
				.nullable()
				.default("selection"),
		})
		.nullable()
		.optional(),
	submitDispatch: dispatchForm.optional().nullable(),
	markAsCompleted: dispatchForm.optional().nullable(),
});

export type UpdateSalesControl = z.infer<typeof updateSalesControlSchema>;

export const salesQueryParamsSchema = z
	.object({
		salesNo: z.string().optional().nullable(),
		salesNos: z.array(z.string()).optional().nullable(),
		dateRange: z.array(z.string()).optional().nullable(),
		salesIds: z.array(z.number()).optional().nullable(),
		"address.id": z.number().optional().nullable(),
		"dealer.id": z.number().optional().nullable(),
		salesType: z.enum(salesType).optional().nullable(),
		"sales.type": z.enum(salesType).optional().nullable(),
		"customer.name": z.string().optional().nullable(),
		customerId: z.number().optional().nullable(),
		phone: z.string().optional().nullable(),
		po: z.string().optional().nullable(),
		item: z.string().optional().nullable(),
		salesRepId: z.number().optional().nullable(),
		"sales.rep": z.string().optional().nullable(),
		showing: z.enum(["all sales", "my sales"]).optional().nullable(),
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
		defaultSearch: z.boolean().optional().nullable(),
		"production.assignedToId": z.number().optional().nullable(),
		"production.dueDate": z.array(z.any()).optional().nullable(),
		productionDueDate: z.string().optional().nullable(),
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
		invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
		production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
		"account.no": z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const deletePackingSchema = z.object({
	salesId: z.number(),
	packingId: z.number().optional().nullable(),
	packingUid: z.string().optional().nullable(),
});
export type DeletePackingSchema = z.infer<typeof deletePackingSchema>;

export const inventoryImportSchema = z
	.object({
		// category: z.string(),
	})
	.extend(paginationSchema.shape);
export type InventoryImport = z.infer<typeof inventoryImportSchema>;
export const inventoryListSchema = z
	.object({
		categoryId: z.number().nullable().optional(),
		subCategoryInvId: z.number().nullable().optional(),
		subCategoryId: z.number().nullable().optional(),
		ids: z.array(z.number()).optional(),
		variantIds: z.array(z.number()).optional(),
	})
	.extend(paginationSchema.shape);
export type InventoryList = z.infer<typeof inventoryListSchema>;
export const inventoryCategoriesSchema = z
	.object({
		title: z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type InventoryCategories = z.infer<typeof inventoryCategoriesSchema>;
export const inventoryFormSchema = z.object({
	mode: z.string().optional().nullable(),
	product: z.object({
		description: z.string().optional().nullable(),
		name: z.string(),
		categoryId: z.number(),
		id: z.number().optional().nullable(),
		status: z.enum(INVENTORY_STATUS),
		stockMonitor: z.boolean().optional().default(false),
		primaryStoreFront: z.boolean().optional().default(false),
	}),
	subCategories: z.array(
		z.object({
			categoryId: z.number().optional().nullable(),
			valueIds: z.array(z.string()).optional().nullable(),
			// values: z.array(
			//   z.object({
			//     id: z.number().optional().nullable(),
			//     deleted: z.boolean().optional().default(false),
			//     inventoryId: z.number().optional().nullable(),
			//   })
			// ),
		}),
	),
	subComponents: z.array(
		z.object({
			id: z.number().optional().nullable(),
			parentId: z.number(),
			defaultInventoryId: z.number().optional().nullable(),
			inventoryCategoryId: z.number(),
			index: z.number().default(0).optional().nullable(),
			status: z.enum(INVENTORY_STATUS).default("draft").optional().nullable(),
		}),
	),
	images: z
		.array(
			z.object({
				altText: z.string().optional().nullable(),
				id: z.number(),
				imageGalleryId: z.number(),
				position: z.number(),
			}),
		)
		.optional()
		.nullable(),
	category: z
		.object({
			id: z.number(),
			enablePricing: z.boolean().optional().nullable(),
		})
		.optional()
		.nullable(),
	variants: z
		.array(
			z.object({
				sku: z.string().optional().nullable(),
				name: z.string().optional().nullable(),
				price: z.number().optional().nullable(),
				cost: z.number().optional().nullable(),
				stock: z.number().optional().nullable(),
				lowStockAlert: z.number().optional().nullable(),
				attributes: z.array(
					z.object({
						id: z.number(),
						attributeId: z.number(),
						attributeInventoryId: z.number(),
					}),
				),
			}),
		)
		.optional()
		.nullable(),
});
export const updateSubComponentSchema =
	inventoryFormSchema.shape.subComponents.element;
export type UpdateSubComponent = z.infer<typeof updateSubComponentSchema>;
export type InventoryForm = z.infer<typeof inventoryFormSchema>;
export const getInventoryCategoriesSchema = z.object({
	// example: z.string(),
});
export type GetInventoryCategories = z.infer<
	typeof getInventoryCategoriesSchema
>;

const productionCalendarDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO calendar date (YYYY-MM-DD).")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00Z`);
		return (
			Number.isFinite(date.getTime()) &&
			date.toISOString().slice(0, 10) === value
		);
	}, "Use a valid calendar date.");

export const salesProductionQueryParamsSchema = z
	.object({
		assignedToId: z.number().optional().nullable(),
		workerId: z.number().optional().nullable(),
		"customer.name": z.string().optional().nullable(),
		phone: z.string().optional().nullable(),
		po: z.string().optional().nullable(),
		item: z.string().optional().nullable(),
		"sales.rep": z.string().optional().nullable(),
		invoice: z.enum(["paid", "pending"]).optional().nullable(),
		tab: z
			.enum(["queue", "reviews", "calendar", "completed"])
			.optional()
			.nullable(),
		queue: z
			.enum([
				"all",
				"unassigned",
				"ready",
				"in-progress",
				"blocked",
				"awaiting-review",
			])
			.optional()
			.nullable(),
		due: z
			.enum(["overdue", "today", "tomorrow", "unscheduled"])
			.optional()
			.nullable(),
		date: productionCalendarDateSchema.optional().nullable(),
		material: z
			.enum(["available", "review", "blocked", "unavailable"])
			.optional()
			.nullable(),
		label: z.string().optional().nullable(),
		production: z.custom<SalesProductionStatusFilter>().optional().nullable(),
		productionDueDate: productionCalendarDateSchema.optional().nullable(),
		productionSort: z
			.enum([
				"priority",
				"dueDateAsc",
				"dueDateDesc",
				"assignedAtAsc",
				"assignedAtDesc",
				"newest",
				"oldest",
			])
			.optional()
			.nullable(),
		"production.assignment": z
			.enum(["all assigned", "not assigned", "part assigned"])
			.optional()
			.nullable(),
		priority: salesPrioritySchema.optional().nullable(),
		"sales.priority": salesPrioritySchema.optional().nullable(),
		salesNo: z.string().optional().nullable(),
		show: z
			.enum(["due-today", "due-tomorrow", "past-due", "future", "unscheduled"])
			.optional()
			.nullable(),
	})
	.extend({
		...paginationSchema.shape,
		sort: z
			.enum([
				"priority",
				"due-asc",
				"due-desc",
				"assigned-asc",
				"assigned-desc",
				"newest",
				"oldest",
			])
			.optional()
			.nullable(),
		size: z.number().int().min(1).max(100).optional().nullable(),
	});
export type SalesProductionQueryParams = z.infer<
	typeof salesProductionQueryParamsSchema
>;

export const salesProductionCalendarQuerySchema = z
	.object({
		from: productionCalendarDateSchema,
		to: productionCalendarDateSchema,
		q: z.string().optional().nullable(),
		assignedToId: z.number().optional().nullable(),
		priority: salesPrioritySchema.optional().nullable(),
	})
	.superRefine((value, ctx) => {
		const from = new Date(`${value.from}T00:00:00Z`);
		const to = new Date(`${value.to}T00:00:00Z`);
		if (
			!Number.isFinite(from.getTime()) ||
			!Number.isFinite(to.getTime()) ||
			to < from
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["to"],
				message: "The calendar end date must be on or after the start date.",
			});
		}
	});
export type SalesProductionCalendarQuery = z.infer<
	typeof salesProductionCalendarQuerySchema
>;

export const variantFormSchema = z.object({
	id: z.number().optional().nullable(),
	price: z.number().optional().nullable(),
	oldPrice: z.number().optional().nullable(),
	pricingId: z.number().optional().nullable(),
	priceHistoryId: z.number().optional().nullable(),
	priceUpdateType: z.enum(["edit", "change"]).optional().nullable(),
	priceUpdateSource: z
		.enum(["manual update", "inbound stock", "bulk update"])
		.optional()
		.nullable(),
	changeReason: z.string().optional().nullable(),
	authorName: z.string().optional().nullable(),
	lowStockAlert: z.number().optional().nullable(),
	inventoryId: z.number(),
	sku: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	status: z.enum(INVENTORY_STATUS).optional().nullable(),
	attributes: z
		.array(
			z.object({
				inventoryId: z.number(),
				attributeId: z.number(),
			}),
		)
		.optional()
		.nullable(),
});
export type VariantForm = z.infer<typeof variantFormSchema>;

export const inventoryCategoryFormSchema = z.object({
	id: z.number().optional().nullable(),
	title: z.string(),
	description: z.string().optional().nullable(),
	type: z.string().optional().nullable(),
	enablePricing: z.boolean().optional().nullable().default(false),
	categoryIdSelector: z.number().optional().nullable(),
	categoryVariantAttributes: z.array(
		z.object({
			id: z.number().optional().nullable(),
			valuesInventoryCategoryId: z.number().nullable(),
			active: z.boolean().nullable(),
		}),
	),
});
export type InventoryCategoryForm = z.infer<typeof inventoryCategoryFormSchema>;

export const updateCategoryVariantAttributeSchema = z.object({
	id: z.number().optional().nullable(),
	active: z.boolean(),
	inventoryCategoryId: z.number().optional(),
	valuesInventoryCategoryId: z.number().optional(),
});
export type UpdateCategoryVariantAttribute = z.infer<
	typeof updateCategoryVariantAttributeSchema
>;
export const linePricingSchema = z.object({
	id: z.number().optional().nullable(),
	qty: z.number().optional().nullable(),
	salesPrice: z.number().nullable().optional(),
	costPrice: z.number().nullable().optional(),
	unitCostPrice: z.number().nullable().optional(),
	unitSalesPrice: z.number().nullable().optional(),
});

export const salesRepPaymentReceivedNotification = z.object({
	email: z.string(),
	orderId: z.array(z.string()),
	customer: z.string(),
	salesRep: z.string(),
});
export type SalesRepPaymentReceivedNotification = z.infer<
	typeof salesRepPaymentReceivedNotification
>;

export const createDispatchSchema = z.object({
	salesId: z.number(),
	deliveryMode: z.string(),
	dueDate: z.date(),
	driverId: z.any().nullable().optional(),
	status: z.string().optional(),
});
export type CreateDispatchSchema = z.infer<typeof createDispatchSchema>;

export const resolvePaymentSchema = z.object({
	transactionId: z.number(),
	action: z.enum(["cancel", "refund"]),
	refundAmount: z.number().optional().nullable(),
	refundMethod: z.enum(SALES_REFUND_METHODS),
	paymentMethod: z.enum(SALES_PAYMENT_METHODS),
	refundMode: z.enum(["full", "part"]),
	reason: z.string(),
	note: z.string().optional().nullable(),
	squarePaymentId: z.string().optional().nullable(),
});
export type ResolvePayment = z.infer<typeof resolvePaymentSchema>;
