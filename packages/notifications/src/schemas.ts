import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import { updateSalesControlSchema } from "../../sales/src/schema";
import { type ChannelName, channelNames } from "./channels";

const channel = z.enum(channelNames);
const source = z.enum(["system", "user"]).default("system");
const priority = z.number().int().min(1).max(10).default(5);
const baseActivityTags = z.object({
	type: channel,
	source,
	priority,
	// sendEmail: z.boolean().optional().default(false),
	// authorContactId: z.number().optional(),
	// authorContactName: z.string().optional(),
});
const activitiesTags = z.object({
	id: z.number(),
	slug: z.string(),
});

export const createActivitySchema = z.object({
	// teamId: z.string().uuid(),
	subject: z.string(),
	headline: z.string().optional(),
	color: z.string().optional(),
	note: z.string().optional(),
	authorId: z.number().optional(),
	// sendEmail: z.boolean().optional().default(false),
	// userIds: z.array(z.number()).optional().nullable(), ///number().optional(),
	// recipientId: z.number().optional(),
	// userIdType: z.enum(["user", "customer"]).optional().default("user"),
	type: channel,
	source,
	// priority,
	// status: z.enum([]),
	// groupId: z.string().uuid().optional(), // Links related activities together
	tags: z.record(z.string(), z.any()), // Flexible - any JSON object
});
export const actityTagsSchema = z.object({
	type: channel,
	source,
	priority,
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const userSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.email().optional().nullable,
	phoneNo: z.string().optional(),
	// locale: z.string().optional(),
	// avatar_url: z.string().optional(),
	// team_id: z.string().uuid(),
	// role: z.enum(["owner", "member"]).optional(),
});

// export const transactionSchema = z.object({
//   id: z.string(),
//   name: z.string(),
//   amount: z.number(),
//   currency: z.string(),
//   date: z.string(),
//   category: z.string().optional(),
//   status: z.string().optional(),
// });

// export const invoiceSchema = z.object({
//   id: z.string(),
//   number: z.string(),
//   amount: z.number(),
//   currency: z.string(),
//   due_date: z.string(),
//   status: z.string(),
// });

export const salesCheckoutSuccessSchema = z.object({
	orderNos: z.array(z.string()).min(1),
	customerName: z.string().optional(),
	totalAmount: z.number().optional(),
});

export type SalesCheckoutSuccessInput = z.infer<
	typeof salesCheckoutSuccessSchema
>;
export const salesCheckoutSuccessTags = actityTagsSchema.extend({
	orderNos: z.array(z.string()).min(1),
	customerName: z.string().optional(),
	totalAmount: z.number().optional(),
});
export type SalesCheckoutSuccessTags = z.infer<typeof salesCheckoutSuccessTags>;

export const salesPaymentRecordedSchema = z.object({
	orderNo: z.string(),
	customerName: z.string().optional(),
	amount: z.number(),
	paymentMethod: z.string(),
});
export type SalesPaymentRecordedInput = z.infer<
	typeof salesPaymentRecordedSchema
>;
export const salesPaymentRecordedTags = actityTagsSchema.extend({
	orderNo: z.string(),
	customerName: z.string().optional(),
	amount: z.number(),
	paymentMethod: z.string(),
});
export type SalesPaymentRecordedTags = z.infer<typeof salesPaymentRecordedTags>;

export const salesPaymentRefundedSchema = z.object({
	orderNo: z.string(),
	customerName: z.string().optional(),
	amount: z.number(),
	reason: z.string().optional(),
});
export type SalesPaymentRefundedInput = z.infer<
	typeof salesPaymentRefundedSchema
>;
export const salesPaymentRefundedTags = actityTagsSchema.extend({
	orderNo: z.string(),
	customerName: z.string().optional(),
	amount: z.number(),
	reason: z.string().optional(),
});
export type SalesPaymentRefundedTags = z.infer<typeof salesPaymentRefundedTags>;

export const jobActivitySchema = z.object({
	users: z.array(userSchema).optional().nullable(),
	jobId: z.number(),
	activityType: z.enum([
		"job_created",
		"job_assigned",
		"job_submitted",
		"job_approved",
		"job_rejected",
		"job_review_requested",
		"job_deleted",
		// "job_updated",
		"job_reassigned",
		"job_status_updated",
		"note_added",
	]),
	author: z.string().optional().nullable(),
	comment: z.string().optional(),
});
export type JobActivityInput = z.infer<typeof jobActivitySchema>;

export const jobAssignedSchema = z.object({
	// contacts: z.array(userSchema).optional().nullable(),
	jobId: z.number(),
	// authorId: z.number(),
	assignedToId: z.number(),
	assignedToName: z.string().optional(),
	// comment: z.string().optional(),
	// author: z.string().optional().nullable(),
});
export type JobAssignedInput = z.infer<typeof jobAssignedSchema>;
export const jobAssignedTags = activitiesTags
	.pick({
		id: true,
	})
	.extend(baseActivityTags.shape)
	.extend(
		z.object({
			assignedToId: z.number(),
			assignedToName: z.string().optional(),
		}).shape,
	);
export type JobAssignedTags = z.infer<typeof jobAssignedTags>;
export const jobSubmittedSchema = z.object({
	jobId: z.number(),
	// submittedById: z.number().optional(),
	// submittedByName: z.string().optional(),
});
export const jobSubmittedTags = actityTagsSchema.extend({
	jobId: z.number(),
});
export type JobSubmittedInput = z.infer<typeof jobSubmittedSchema>;
export type JobSubmittedTags = z.infer<typeof jobSubmittedTags>;

export const jobReviewRequestedSchema = z.object({
	jobId: z.number(),
	requestedById: z.number().optional(),
	requestedByName: z.string().optional(),
});
export type JobReviewRequestedInput = z.infer<typeof jobReviewRequestedSchema>;
export const jobReviewRequestedTags = actityTagsSchema.extend({
	jobId: z.number(),
	requestedById: z.number().optional(),
	requestedByName: z.string().optional(),
});
export type JobReviewRequestedTags = z.infer<typeof jobReviewRequestedTags>;
export const jobApprovedSchema = z.object({
	jobId: z.number(),
	contractorId: z.number(),
	// approvedById: z.number().optional(),
	// approvedByName: z.string().optional(),
	note: z.string().optional(),
});
export const jobApprovedTags = actityTagsSchema.extend({
	jobId: z.number(),
	contractorId: z.number(),
});
export type JobApprovedTags = z.infer<typeof jobApprovedTags>;
export type JobApprovedInput = z.infer<typeof jobApprovedSchema>;
export const jobRejectedSchema = z.object({
	jobId: z.number(),
	contractorId: z.number(),
	// rejectedById: z.number().optional(),
	// rejectedByName: z.string().optional(),
	note: z.string().optional(),
});
export type JobRejectedInput = z.infer<typeof jobRejectedSchema>;
export const jobRejectedTags = actityTagsSchema.extend({
	jobId: z.number(),
	contractorId: z.number(),
	note: z.string().optional(),
});
export type JobRejectedTags = z.infer<typeof jobRejectedTags>;
export const jobDeletedSchema = z.object({
	jobId: z.number(),
});
export type JobDeletedInput = z.infer<typeof jobDeletedSchema>;
export const jobDeletedTags = actityTagsSchema.extend({
	jobId: z.number(),
});
export type JobDeletedTags = z.infer<typeof jobDeletedTags>;
export const jobPaymentSentSchema = z.object({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
	paymentMethod: z.string(),
});
export type JobPaymentSentInput = z.infer<typeof jobPaymentSentSchema>;
export const jobPaymentSentTags = actityTagsSchema.extend({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
	paymentMethod: z.string(),
});
export type JobPaymentSentTags = z.infer<typeof jobPaymentSentTags>;
export const payoutCancelledSchema = z.object({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
});
export type PayoutCancelledInput = z.infer<typeof payoutCancelledSchema>;
export const payoutCancelledTags = actityTagsSchema.extend({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
});
export type PayoutCancelledTags = z.infer<typeof payoutCancelledTags>;
export const payoutReversedSchema = z.object({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
});
export type PayoutReversedInput = z.infer<typeof payoutReversedSchema>;
export const payoutReversedTags = actityTagsSchema.extend({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	amount: z.number(),
});
export type PayoutReversedTags = z.infer<typeof payoutReversedTags>;
export const payoutIssuesSchema = z.object({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	issueCount: z.number(),
	amount: z.number(),
	reason: z.string(),
});
export type PayoutIssuesInput = z.infer<typeof payoutIssuesSchema>;
export const payoutIssuesTags = actityTagsSchema.extend({
	paymentId: z.number(),
	contractorId: z.number(),
	jobCount: z.number(),
	issueCount: z.number(),
	amount: z.number(),
	reason: z.string(),
});
export type PayoutIssuesTags = z.infer<typeof payoutIssuesTags>;
export const jobTaskConfigureRequestSchema = z.object({
	contractorId: z.number(),
	jobId: z.number(),
	modelName: z.string(),
	projectName: z.string(),
	builderName: z.string(),
	builderTaskId: z.number(),
	modelId: z.number(),
	lotBlock: z.string(),
	taskName: z.string(),
});
export type JobTaskConfigureRequestInput = z.infer<
	typeof jobTaskConfigureRequestSchema
>;
export const jobTaskConfigureRequestTags = actityTagsSchema.extend({
	contractorId: z.coerce.number(),
	jobId: z.coerce.number(),
	modelName: z.string(),
	projectName: z.string(),
	builderName: z.string(),
	builderTaskId: z.coerce.number(),
	modelId: z.coerce.number(),
});
export type JobTaskConfigureRequestTags = z.infer<
	typeof jobTaskConfigureRequestTags
>;
export const jobTaskConfiguredSchema = z.object({
	contractorId: z.number(),
	jobId: z.number(),
});
export type JobTaskConfiguredInput = z.infer<typeof jobTaskConfiguredSchema>;
export const jobTaskConfiguredTags = actityTagsSchema.extend({
	contractorId: z.coerce.number(),
	jobId: z.coerce.number(),
});
export type JobTaskConfiguredTags = z.infer<typeof jobTaskConfiguredTags>;
export const employeeDocumentReviewSchema = z.object({
	documentId: z.number(),
	userId: z.number(),
	userName: z.string(),
	documentTitle: z.string(),
	documentUrl: z.string().url(),
	description: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
});
export type EmployeeDocumentReviewInput = z.infer<
	typeof employeeDocumentReviewSchema
>;
export const employeeDocumentReviewTags = actityTagsSchema.extend({
	documentId: z.coerce.number(),
	userId: z.coerce.number(),
	userName: z.string(),
	documentTitle: z.string(),
	documentUrl: z.string().url(),
	description: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
});
export type EmployeeDocumentReviewTags = z.infer<
	typeof employeeDocumentReviewTags
>;

const documentIdsTagSchema = z
	.union([z.string(), z.array(z.string())])
	.transform((value) => (Array.isArray(value) ? value : [value]));
const documentNamesTagSchema = z
	.union([z.string(), z.array(z.string())])
	.transform((value) => (Array.isArray(value) ? value : [value]));

export const communityDocumentsSchema = z.object({
	projectId: z.number(),
	projectSlug: z.string(),
	projectTitle: z.string(),
	uploadedByName: z.string(),
	documentIds: z.array(z.string()).min(1),
	documentNames: z.array(z.string()).optional(),
	note: z.string().optional().nullable(),
});
export type CommunityDocumentsInput = z.infer<typeof communityDocumentsSchema>;
export const communityDocumentsTags = actityTagsSchema.extend({
	projectId: z.coerce.number(),
	projectSlug: z.string(),
	projectTitle: z.string(),
	documentIds: documentIdsTagSchema,
	documentNames: documentNamesTagSchema.optional(),
});
export type CommunityDocumentsTags = z.infer<typeof communityDocumentsTags>;

const orderNosTagSchema = z
	.union([z.string(), z.array(z.string())])
	.transform((value) => (Array.isArray(value) ? value : [value]));

export const inventoryInboundActivitySchema = z.object({
	inboundId: z.number(),
	supplierId: z.number().optional().nullable(),
	supplierName: z.string().optional().nullable(),
	reference: z.string().optional().nullable(),
	activityType: z.enum([
		"created",
		"documents_uploaded",
		"extraction_started",
		"extraction_completed",
		"extraction_failed",
		"extraction_applied",
		"demands_assigned",
		"received",
	]),
	documentIds: z.array(z.string()).optional(),
	orderNos: z.array(z.string()).optional(),
	note: z.string().optional().nullable(),
});
export type InventoryInboundActivityInput = z.infer<
	typeof inventoryInboundActivitySchema
>;
export const inventoryInboundActivityTags = actityTagsSchema.extend({
	inboundId: z.coerce.number(),
	supplierId: z.coerce.number().optional(),
	supplierName: z.string().optional(),
	reference: z.string().optional(),
	activityType: z.enum([
		"created",
		"documents_uploaded",
		"extraction_started",
		"extraction_completed",
		"extraction_failed",
		"extraction_applied",
		"demands_assigned",
		"received",
	]),
	documentIds: documentIdsTagSchema.optional(),
	orderNos: orderNosTagSchema.optional(),
});
export type InventoryInboundActivityTags = z.infer<
	typeof inventoryInboundActivityTags
>;

export const communityUnitProductionStartedSchema = z.object({
	taskId: z.number(),
	taskName: z.string(),
	unitId: z.number().nullable().optional(),
	unitLotBlock: z.string().nullable().optional(),
	projectId: z.number().nullable().optional(),
	projectName: z.string().nullable().optional(),
	actorUserId: z.number(),
	actorName: z.string(),
	status: z.literal("started"),
	timestamp: z.string(),
});
export type CommunityUnitProductionStartedInput = z.infer<
	typeof communityUnitProductionStartedSchema
>;
export const communityUnitProductionStartedTags = actityTagsSchema.extend({
	taskId: z.coerce.number(),
	unitId: z.coerce.number().optional(),
	projectId: z.coerce.number().optional(),
});
export type CommunityUnitProductionStartedTags = z.infer<
	typeof communityUnitProductionStartedTags
>;

export const communityUnitProductionStoppedSchema = z.object({
	taskId: z.number(),
	taskName: z.string(),
	unitId: z.number().nullable().optional(),
	unitLotBlock: z.string().nullable().optional(),
	projectId: z.number().nullable().optional(),
	projectName: z.string().nullable().optional(),
	actorUserId: z.number(),
	actorName: z.string(),
	status: z.literal("stopped"),
	timestamp: z.string(),
});
export type CommunityUnitProductionStoppedInput = z.infer<
	typeof communityUnitProductionStoppedSchema
>;
export const communityUnitProductionStoppedTags = actityTagsSchema.extend({
	taskId: z.coerce.number(),
	unitId: z.coerce.number().optional(),
	projectId: z.coerce.number().optional(),
});
export type CommunityUnitProductionStoppedTags = z.infer<
	typeof communityUnitProductionStoppedTags
>;

export const communityUnitProductionCompletedSchema = z.object({
	taskId: z.number(),
	taskName: z.string(),
	unitId: z.number().nullable().optional(),
	unitLotBlock: z.string().nullable().optional(),
	projectId: z.number().nullable().optional(),
	projectName: z.string().nullable().optional(),
	actorUserId: z.number(),
	actorName: z.string(),
	status: z.literal("completed"),
	completedFromIdle: z.boolean().default(false),
	timestamp: z.string(),
});
export type CommunityUnitProductionCompletedInput = z.infer<
	typeof communityUnitProductionCompletedSchema
>;
export const communityUnitProductionCompletedTags = actityTagsSchema.extend({
	taskId: z.coerce.number(),
	unitId: z.coerce.number().optional(),
	projectId: z.coerce.number().optional(),
});
export type CommunityUnitProductionCompletedTags = z.infer<
	typeof communityUnitProductionCompletedTags
>;

export const communityUnitProductionBatchUpdatedSchema = z.object({
	action: z.enum(["start", "stop", "complete"]),
	taskIds: z.array(z.number()).min(1),
	unitIds: z.array(z.number()),
	projectIds: z.array(z.number()),
	count: z.number().int().min(1),
	projectId: z.number().nullable().optional(),
	projectName: z.string().nullable().optional(),
	actorUserId: z.number(),
	actorName: z.string(),
	timestamp: z.string(),
});
export type CommunityUnitProductionBatchUpdatedInput = z.infer<
	typeof communityUnitProductionBatchUpdatedSchema
>;
export const communityUnitProductionBatchUpdatedTags = actityTagsSchema.extend({
	taskId: z.array(z.coerce.number()),
	unitId: z.array(z.coerce.number()),
	projectId: z.array(z.coerce.number()),
});
export type CommunityUnitProductionBatchUpdatedTags = z.infer<
	typeof communityUnitProductionBatchUpdatedTags
>;
// Notification types map - all available notification types with their data structures

export type NotificationTypes = {
	sales_checkout_success: SalesCheckoutSuccessInput;
	sales_payment_recorded: SalesPaymentRecordedInput;
	sales_payment_refunded: SalesPaymentRefundedInput;
	// job_activity: JobActivityInput;
	job_assigned: JobAssignedInput;
	job_submitted: JobSubmittedInput;
	job_review_requested: JobReviewRequestedInput;
	job_approved: JobApprovedInput;
	job_rejected: JobRejectedInput;
	job_deleted: JobDeletedInput;
	job_payment_sent: JobPaymentSentInput;
	payout_cancelled: PayoutCancelledInput;
	payout_reversed: PayoutReversedInput;
	payout_issues: PayoutIssuesInput;
	job_task_configure_request: JobTaskConfigureRequestInput;
	job_task_configured: JobTaskConfiguredInput;
	employee_document_review: EmployeeDocumentReviewInput;
	community_documents: CommunityDocumentsInput;
	inventory_inbound: InventoryInboundInput;
	inventory_inbound_activity: InventoryInboundActivityInput;
	community_unit_production_started: CommunityUnitProductionStartedInput;
	community_unit_production_stopped: CommunityUnitProductionStoppedInput;
	community_unit_production_completed: CommunityUnitProductionCompletedInput;
	community_unit_production_batch_updated: CommunityUnitProductionBatchUpdatedInput;
	sales_dispatch_assigned: SalesDispatchAssignedInput;
	sales_dispatch_queued: SalesDispatchQueuedInput;
	sales_dispatch_cancelled: SalesDispatchCancelledInput;
	sales_dispatch_completed: SalesDispatchCompletedInput;
	sales_dispatch_packed: SalesDispatchPackedInput;
	sales_dispatch_packing_reset: SalesDispatchPackingResetInput;
	sales_dispatch_in_progress: SalesDispatchInProgressInput;
	sales_dispatch_trip_canceled: SalesDispatchTripCanceledInput;
	sales_dispatch_date_updated: SalesDispatchDateUpdatedInput;
	sales_dispatch_unassigned: SalesDispatchUnassignedInput;
	sales_marked_as_production_completed: SalesMarkedAsProductionCompletedInput;
	sales_production_all_completed: SalesProductionAllCompletedInput;
	sales_email_reminder: SalesEmailReminderInput;
	simple_sales_email_reminder: SimpleSalesEmailReminderInput;
	sales_reminder_schedule_admin_notification: SalesReminderScheduleAdminNotificationInput;
	sales_info: SalesInfoInput;
	sales_item_info: SalesItemInfoInput;
	sales_dispatch_info: SalesDispatchInfoInput;
	sales_request_packing: SalesRequestPackingInput;
	"sales-packing-list": SalesPackingListInput;
	dispatch_packing_delay: DispatchPackingDelayInput;
	sales_dispatch_duplicate_alert: SalesDispatchDuplicateAlertInput;
	sales_production_assigned: SalesProductionAssignedInput;
};

export const getNotificationChannelsSchema = z
	.object({
		id: z.number().optional().nullable(),
		name: z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetNotificationChannelsSchema = z.infer<
	typeof getNotificationChannelsSchema
>;
export const salesDispatchAssignedSchema = z.object({
	// salesId: z.number(),
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
	// status: z.enum(["queue", "assigned", "en_route", "delivered"]).optional(),
});
export type SalesDispatchAssignedInput = z.infer<
	typeof salesDispatchAssignedSchema
>;
export const salesDispatchAssignedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchAssignedTags = z.infer<
	typeof salesDispatchAssignedTags
>;
export const salesProductionAssignedSchema = z.object({
	salesId: z.number(),
	orderNo: z.string().optional(),
	assignedToId: z.number(),
	assignedQty: z.number().optional(),
	itemCount: z.number().optional(),
	dueDate: z.date().optional(),
});
export type SalesProductionAssignedInput = z.infer<
	typeof salesProductionAssignedSchema
>;
export const salesProductionAssignedTags = actityTagsSchema.extend({
	salesId: z.number(),
	orderNo: z.string().optional(),
	assignedToId: z.number(),
	assignedQty: z.number().optional(),
	itemCount: z.number().optional(),
	dueDate: z.date().optional(),
});
export type SalesProductionAssignedTags = z.infer<
	typeof salesProductionAssignedTags
>;
export const salesDispatchQueuedSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchQueuedInput = z.infer<
	typeof salesDispatchQueuedSchema
>;
export const salesDispatchQueuedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchQueuedTags = z.infer<typeof salesDispatchQueuedTags>;
export const salesDispatchCancelledSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchCancelledInput = z.infer<
	typeof salesDispatchCancelledSchema
>;
export const salesDispatchCancelledTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchCancelledTags = z.infer<
	typeof salesDispatchCancelledTags
>;
export const salesDispatchCompletedSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
	signature: z.string().optional(),
	attachments: z.array(z.string()).optional(),
});
export type SalesDispatchCompletedInput = z.infer<
	typeof salesDispatchCompletedSchema
>;
export const salesDispatchCompletedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
	signature: z.string().optional(),
	attachments: z.array(z.string()).optional(),
});
export type SalesDispatchCompletedTags = z.infer<
	typeof salesDispatchCompletedTags
>;
export const salesDispatchPackedSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchPackedInput = z.infer<
	typeof salesDispatchPackedSchema
>;
export const salesDispatchPackedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchPackedTags = z.infer<typeof salesDispatchPackedTags>;
export const salesDispatchPackingResetSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchPackingResetInput = z.infer<
	typeof salesDispatchPackingResetSchema
>;
export const salesDispatchPackingResetTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchPackingResetTags = z.infer<
	typeof salesDispatchPackingResetTags
>;
export const salesDispatchInProgressSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchInProgressInput = z.infer<
	typeof salesDispatchInProgressSchema
>;
export const salesDispatchInProgressTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchInProgressTags = z.infer<
	typeof salesDispatchInProgressTags
>;
export const salesDispatchTripCanceledSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchTripCanceledInput = z.infer<
	typeof salesDispatchTripCanceledSchema
>;
export const salesDispatchTripCanceledTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchTripCanceledTags = z.infer<
	typeof salesDispatchTripCanceledTags
>;
export const salesDispatchUnassignedSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchUnassignedInput = z.infer<
	typeof salesDispatchUnassignedSchema
>;
export const salesDispatchUnassignedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchUnassignedTags = z.infer<
	typeof salesDispatchUnassignedTags
>;
export const salesDispatchDateUpdatedSchema = z.object({
	orderNo: z.string().optional(),
	dispatchId: z.number(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchDateUpdatedInput = z.infer<
	typeof salesDispatchDateUpdatedSchema
>;
export const salesDispatchDateUpdatedTags = actityTagsSchema.extend({
	dispatchId: z.number(),
	orderNo: z.string().optional(),
	deliveryMode: z.enum(["pickup", "delivery"]).optional(),
	dueDate: z.date().optional(),
	driverId: z.number().optional(),
});
export type SalesDispatchDateUpdatedTags = z.infer<
	typeof salesDispatchDateUpdatedTags
>;
export const salesMarkedAsProductionCompletedSchema = z.object({
	salesId: z.number(),
	orderNo: z.string().optional(),
});
export type SalesMarkedAsProductionCompletedInput = z.infer<
	typeof salesMarkedAsProductionCompletedSchema
>;
export const salesMarkedAsProductionCompletedTags = actityTagsSchema.extend({
	salesId: z.number(),
	orderNo: z.string().optional(),
});
export type SalesMarkedAsProductionCompletedTags = z.infer<
	typeof salesMarkedAsProductionCompletedTags
>;
export const salesProductionAllCompletedSchema = z.object({
	salesId: z.number(),
	orderNo: z.string().optional(),
});
export type SalesProductionAllCompletedInput = z.infer<
	typeof salesProductionAllCompletedSchema
>;
export const salesProductionAllCompletedTags = actityTagsSchema.extend({
	salesId: z.number(),
	orderNo: z.string().optional(),
});
export type SalesProductionAllCompletedTags = z.infer<
	typeof salesProductionAllCompletedTags
>;
export const salesEmailReminderSchema = z.object({
	type: z.enum(["order", "quote"]),
	customerEmail: z.string().email(),
	customerName: z.string(),
	salesRep: z.string(),
	salesRepEmail: z.string().email(),
	note: z.string().optional().nullable(),
	paymentToken: z.string().optional().nullable(),
	pdfToken: z.string().optional().nullable(),
	paymentLink: z.string().optional().nullable(),
	pdfLink: z.string().optional().nullable(),
	sales: z.array(
		z.object({
			orderId: z.string(),
			po: z.string().optional().nullable(),
			date: z.union([z.date(), z.string()]),
			total: z.number(),
			due: z.number(),
		}),
	),
});
export type SalesEmailReminderInput = z.infer<typeof salesEmailReminderSchema>;
export const salesEmailReminderTags = actityTagsSchema.extend({
	customerEmail: z.string().email(),
	customerName: z.string(),
	salesCount: z.number(),
	reminderType: z.enum(["order", "quote"]),
	salesNo: z.array(z.string()).optional(),
	hasPaymentLink: z.boolean().optional(),
	hasPdfLink: z.boolean().optional(),
});
export type SalesEmailReminderTags = z.infer<typeof salesEmailReminderTags>;
export const simpleSalesEmailReminderSchema = z
	.object({
		salesId: z.number(),
		payPlan: z
			.union([
				z.number(),
				z.literal("full"),
				z.literal("custom"),
				z.literal("flexible"),
			])
			.optional()
			.nullable(),
		preferredAmount: z.number().optional().nullable(),
		attachInvoice: z.boolean().optional(),
		note: z.string().optional().nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.payPlan === "custom" && !value.preferredAmount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredAmount"],
				message: "Preferred amount is required for custom pay plans.",
			});
		}
	});
export type SimpleSalesEmailReminderInput = z.infer<
	typeof simpleSalesEmailReminderSchema
>;
export const simpleSalesEmailReminderTags = actityTagsSchema.extend({
	salesId: z.number(),
	salesNo: z.string(),
	payPlan: z
		.union([
			z.number(),
			z.literal("full"),
			z.literal("custom"),
			z.literal("flexible"),
		])
		.optional()
		.nullable(),
	preferredAmount: z.number().optional().nullable(),
	attachInvoice: z.boolean().optional(),
});
export type SimpleSalesEmailReminderTags = z.infer<
	typeof simpleSalesEmailReminderTags
>;
export const salesReminderScheduleAdminNotificationSchema = z.object({
	triggerType: z.enum(["scheduled", "now", "test"]),
	statusUsed: z.enum(["active", "inactive"]),
	filterUsed: z.record(z.string(), z.any()).optional().nullable(),
	foundSalesCount: z.number(),
	validSalesCount: z.number(),
	groupedRecipientCount: z.number(),
	deliveredGroupCount: z.number(),
	failedGroupCount: z.number(),
	skippedSalesCount: z.number(),
	totalPendingAmount: z.number(),
	totalSalesAmount: z.number(),
	successfulRecipients: z.array(
		z.object({
			recipientRole: z.enum(["customer", "address"]),
			recipientId: z.number(),
			recipientName: z.string(),
			recipientEmail: z.string().email(),
			salesCount: z.number(),
			totalPendingAmount: z.number(),
			totalSalesAmount: z.number(),
			sales: z.array(
				z.object({
					saleId: z.number(),
					orderId: z.string(),
					po: z.string().optional().nullable(),
					date: z.union([z.date(), z.string()]),
					due: z.number(),
					total: z.number(),
				}),
			),
		}),
	),
	skippedSales: z.array(
		z.object({
			saleId: z.number(),
			orderId: z.string(),
			customerName: z.string().optional().nullable(),
			customerEmail: z.string().optional().nullable(),
			addressEmail: z.string().optional().nullable(),
			salesRepEmail: z.string().optional().nullable(),
			reasons: z.array(z.string()),
			amountDue: z.number(),
			grandTotal: z.number(),
		}),
	),
	successfulRecipientsTruncated: z.number().int().min(0).optional().default(0),
	skippedSalesTruncated: z.number().int().min(0).optional().default(0),
});
export type SalesReminderScheduleAdminNotificationInput = z.infer<
	typeof salesReminderScheduleAdminNotificationSchema
>;
export const salesReminderScheduleAdminNotificationTags =
	actityTagsSchema.extend({
		triggerType: z.enum(["scheduled", "now", "test"]),
		statusUsed: z.enum(["active", "inactive"]),
		foundSalesCount: z.number(),
		deliveredGroupCount: z.number(),
		failedGroupCount: z.number(),
		skippedSalesCount: z.number(),
	});
export type SalesReminderScheduleAdminNotificationTags = z.infer<
	typeof salesReminderScheduleAdminNotificationTags
>;
export const salesInfoSchema = z.object({
	headline: z.string().optional(),
	note: z.string().optional(),
	color: z.string().optional(),
	salesId: z.number(),
	salesNo: z.string(),
});
export type SalesInfoInput = z.infer<typeof salesInfoSchema>;
export const salesInfoTags = actityTagsSchema.extend({
	salesId: z.number(),
	salesNo: z.string(),
});
export type SalesInfoTags = z.infer<typeof salesInfoTags>;
export const inventoryInboundSchema = z.object({
	headline: z.string().optional(),
	note: z.string().optional(),
	color: z.string().optional(),
	salesId: z.number(),
	salesNo: z.string(),
	attachment: z.array(z.string()).optional(),
});
export type InventoryInboundInput = z.infer<typeof inventoryInboundSchema>;
export const inventoryInboundTags = actityTagsSchema.extend({
	salesId: z.number(),
	salesNo: z.string(),
	attachment: z.array(z.string()).optional(),
});
export type InventoryInboundTags = z.infer<typeof inventoryInboundTags>;
export const salesItemInfoSchema = z.object({
	headline: z.string(),
	note: z.string().optional(),
	color: z.string().optional(),
	salesId: z.number(),
	salesNo: z.string(),
	itemId: z.number(),
	itemControlId: z.number(),
});
export type SalesItemInfoInput = z.infer<typeof salesItemInfoSchema>;
export const salesItemInfoTags = actityTagsSchema.extend({
	salesId: z.number(),
	salesNo: z.string(),
	itemId: z.number(),
	itemControlId: z.number(),
});
export type SalesItemInfoTags = z.infer<typeof salesItemInfoTags>;
export const salesDispatchInfoSchema = z.object({
	headline: z.string(),
	color: z.string().optional(),
	dispatchId: z.number(),
});
export type SalesDispatchInfoInput = z.infer<typeof salesDispatchInfoSchema>;
export const salesDispatchInfoTags = actityTagsSchema.extend({
	dispatchId: z.number(),
});
export type SalesDispatchInfoTags = z.infer<typeof salesDispatchInfoTags>;
export const salesDispatchDuplicateAlertSchema = z.object({
	dispatchId: z.number(),
});
export type SalesDispatchDuplicateAlertInput = z.infer<
	typeof salesDispatchDuplicateAlertSchema
>;
export const salesDispatchDuplicateAlertTags = actityTagsSchema.extend({
	dispatchId: z.number(),
});
export type SalesDispatchDuplicateAlertTags = z.infer<
	typeof salesDispatchDuplicateAlertTags
>;
export const salesRequestPackingSchema = z.object({
	orderNo: z.string(),
	dispatchId: z.number(),
	packItems: updateSalesControlSchema.shape.packItems,
});
export type SalesRequestPackingInput = z.infer<
	typeof salesRequestPackingSchema
>;
export const salesRequestPackingTags = actityTagsSchema.extend({
	orderNo: z.string(),
	dispatchId: z.number(),
	packItems: updateSalesControlSchema.shape.packItems,
});
export type SalesRequestPackingTags = z.infer<typeof salesRequestPackingTags>;
export const salesPackingListSchema = z.object({
	salesId: z.number(),
	orderNo: z.string(),
	dispatchId: z.number(),
	status: z.enum(["queue", "completed", "cancelled"]),
});
export type SalesPackingListInput = z.infer<typeof salesPackingListSchema>;
export const salesPackingListTags = actityTagsSchema.extend({
	salesId: z.number(),
	orderNo: z.string(),
	dispatchId: z.number(),
	status: z.enum(["queue", "completed", "cancelled"]),
});
export type SalesPackingListTags = z.infer<typeof salesPackingListTags>;
export const dispatchPackingDelaySchema = z.object({
	orderNo: z.string(),
	dispatchId: z.number(),
	salesItemId: z.number().optional().nullable(),
	itemUid: z.string(),
	itemName: z.string(),
	pendingQty: z.object({
		qty: z.number().optional(),
		lh: z.number().optional(),
		rh: z.number().optional(),
	}),
	note: z.string().optional(),
});
export type DispatchPackingDelayInput = z.infer<
	typeof dispatchPackingDelaySchema
>;
export const dispatchPackingDelayTags = actityTagsSchema.extend({
	orderNo: z.string(),
	dispatchId: z.number(),
	salesItemId: z.number().optional().nullable(),
	itemUid: z.string(),
	itemName: z.string(),
	pendingQty: z.object({
		qty: z.number().optional(),
		lh: z.number().optional(),
		rh: z.number().optional(),
	}),
	note: z.string().optional(),
});
export type DispatchPackingDelayTags = z.infer<typeof dispatchPackingDelayTags>;
export const baseNotificationJobSchema = z.object({
	author: z.object({
		id: z.number(),
		role: z.enum(["customer", "employee"]).default("employee"),
	}),
	recipients: z
		.array(
			z.object({
				ids: z.array(z.number()),
				role: z
					.enum(["customer", "employee", "address"])
					.optional()
					.default("employee"),
			}),
		)
		.optional()
		.nullable(),
	// channel: z.enum(channelNames).default('job_approved'),
	// channel: z.enum(["a"] as const),
	payload: z.record(z.string(), z.any()),
});

const _channel = (channel: ChannelName) => channel as string;
//z.literal(channel);
export const notificationJobSchema = z.discriminatedUnion("channel", [
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_checkout_success"),
		payload: salesCheckoutSuccessSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_payment_recorded"),
		payload: salesPaymentRecordedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_payment_refunded"),
		payload: salesPaymentRefundedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_assigned"),
		payload: jobAssignedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_submitted"),
		payload: jobSubmittedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_review_requested"),
		payload: jobReviewRequestedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_approved"),
		payload: jobApprovedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_rejected"),
		payload: jobRejectedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_deleted"),
		payload: jobDeletedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_payment_sent"),
		payload: jobPaymentSentSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("payout_cancelled"),
		payload: payoutCancelledSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("payout_reversed"),
		payload: payoutReversedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("payout_issues"),
		payload: payoutIssuesSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_task_configure_request"),
		payload: jobTaskConfigureRequestSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("job_task_configured"),
		payload: jobTaskConfiguredSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("employee_document_review"),
		payload: employeeDocumentReviewSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("community_documents"),
		payload: communityDocumentsSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("inventory_inbound_activity"),
		payload: inventoryInboundActivitySchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("community_unit_production_started"),
		payload: communityUnitProductionStartedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("community_unit_production_stopped"),
		payload: communityUnitProductionStoppedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("community_unit_production_completed"),
		payload: communityUnitProductionCompletedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("community_unit_production_batch_updated"),
		payload: communityUnitProductionBatchUpdatedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_assigned"),
		payload: salesDispatchAssignedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_production_assigned"),
		payload: salesProductionAssignedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_queued"),
		payload: salesDispatchQueuedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_cancelled"),
		payload: salesDispatchCancelledSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_completed"),
		payload: salesDispatchCompletedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_packed"),
		payload: salesDispatchPackedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_packing_reset"),
		payload: salesDispatchPackingResetSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_in_progress"),
		payload: salesDispatchInProgressSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_trip_canceled"),
		payload: salesDispatchTripCanceledSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_unassigned"),
		payload: salesDispatchUnassignedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_date_updated"),
		payload: salesDispatchDateUpdatedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_marked_as_production_completed"),
		payload: salesMarkedAsProductionCompletedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_production_all_completed"),
		payload: salesProductionAllCompletedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_email_reminder"),
		payload: salesEmailReminderSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("simple_sales_email_reminder"),
		payload: simpleSalesEmailReminderSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_reminder_schedule_admin_notification"),
		payload: salesReminderScheduleAdminNotificationSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("inventory_inbound"),
		payload: inventoryInboundSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_info"),
		payload: salesInfoSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_item_info"),
		payload: salesItemInfoSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_info"),
		payload: salesDispatchInfoSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_created"),
		payload: salesDispatchAssignedSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_request_packing"),
		payload: salesRequestPackingSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales-packing-list"),
		payload: salesPackingListSchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("dispatch_packing_delay"),
		payload: dispatchPackingDelaySchema,
	}),
	baseNotificationJobSchema.extend({
		channel: z.literal("sales_dispatch_duplicate_alert"),
		payload: salesDispatchDuplicateAlertSchema,
	}),
]);
export type NotificationJobInput = z.infer<typeof notificationJobSchema>;
