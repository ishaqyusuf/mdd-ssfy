import {
	getPublicSpecialOrderApproval,
	getSpecialOrderApprovalHistory,
	issueSpecialOrderApprovalRequest,
	prepareSpecialOrderApprovalLink,
	removeSpecialOrderClassification,
	respondToSpecialOrderApproval,
	retrySpecialOrderStatusNotifications,
} from "@api/db/queries/special-order-approval";
import { enrollSpecialOrderFromOverview } from "@api/db/queries/special-order-enrollment";
import { getSpecialOrderEnrollmentAccess } from "@api/db/queries/special-order-settings";
import {
	specialOrderApprovalResponseSchema,
	specialOrderEnrollmentSchema,
	specialOrderHistorySchema,
	specialOrderNotificationRetrySchema,
	specialOrderPublicTokenSchema,
	specialOrderReapprovalSchema,
	specialOrderRemovalSchema,
	specialOrderRequestSchema,
} from "@api/schemas/special-order";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

async function requireSpecialOrderEditor(
	ctx: Parameters<typeof requireAnyOperationalPermission>[0],
) {
	return requireAnyOperationalPermission(
		ctx,
		["editOrders"],
		"You do not have permission to manage Special Order approval.",
	);
}

async function requireSpecialOrderViewer(
	ctx: Parameters<typeof requireAnyOperationalPermission>[0],
) {
	return requireAnyOperationalPermission(
		ctx,
		["viewOrders", "editOrders"],
		"You do not have permission to view Special Order approval history.",
	);
}

export const specialOrderRouter = createTRPCRouter({
	enrollmentAccess: protectedProcedure.query(({ ctx }) =>
		getSpecialOrderEnrollmentAccess(ctx.db, ctx.userId ?? null),
	),
	enrollFromOverview: protectedProcedure
		.input(specialOrderEnrollmentSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return enrollSpecialOrderFromOverview(ctx, input);
		}),
	requestApproval: protectedProcedure
		.input(specialOrderRequestSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return issueSpecialOrderApprovalRequest(ctx, input);
		}),
	requestReapproval: protectedProcedure
		.input(specialOrderReapprovalSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return issueSpecialOrderApprovalRequest(ctx, {
				...input,
				forceReplacement: true,
				reapprovalReason: input.reason,
			});
		}),
	prepareApprovalLink: protectedProcedure
		.input(specialOrderRequestSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return prepareSpecialOrderApprovalLink(ctx, input.salesId);
		}),
	remove: protectedProcedure
		.input(specialOrderRemovalSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return removeSpecialOrderClassification(ctx, input);
		}),
	history: protectedProcedure
		.input(specialOrderHistorySchema)
		.query(async ({ ctx, input }) => {
			await requireSpecialOrderViewer(ctx);
			return getSpecialOrderApprovalHistory(ctx, input.salesId);
		}),
	retryNotifications: protectedProcedure
		.input(specialOrderNotificationRetrySchema)
		.mutation(async ({ ctx, input }) => {
			await requireSpecialOrderEditor(ctx);
			return retrySpecialOrderStatusNotifications(ctx, input);
		}),
	publicReview: publicProcedure
		.input(specialOrderPublicTokenSchema)
		.query(({ ctx, input }) => getPublicSpecialOrderApproval(ctx, input.token)),
	respond: publicProcedure
		.input(specialOrderApprovalResponseSchema)
		.mutation(({ ctx, input }) => respondToSpecialOrderApproval(ctx, input)),
});
