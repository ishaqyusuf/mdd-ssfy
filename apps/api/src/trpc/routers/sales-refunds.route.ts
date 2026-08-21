import {
	allocateExternalSalesSquareRefund,
	createSalesSquareRefundIntent,
	getExternalSquareRefundReviewQueue,
	getSalesRefundOverview,
	retrySalesSquareRefund,
} from "@api/db/queries/sales-refunds";
import {
	allocateExternalSalesSquareRefundSchema,
	createSalesSquareRefundSchema,
	retrySalesSquareRefundSchema,
	salesRefundOverviewSchema,
} from "@api/schemas/sales-refunds";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { requireSalesOverviewViewer } from "@api/utils/sales-overview-access";
import { TRPCError } from "@trpc/server";

function requireSquareRefundFeatureEnabled() {
	if (process.env.SQUARE_REFUNDS_ENABLED === "false") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Square refunds are temporarily disabled.",
		});
	}
}

export const salesRefundsRouter = createTRPCRouter({
	externalReview: protectedProcedure.query(async ({ ctx }) => {
		await requireAnyOperationalPermission(
			ctx,
			["viewOrderPayment", "editOrderPayment", "editRefundSquare"],
			"You do not have permission to review external Square refunds.",
		);
		return getExternalSquareRefundReviewQueue(ctx);
	}),
	overview: protectedProcedure
		.input(salesRefundOverviewSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesOverviewViewer(ctx);
			return getSalesRefundOverview(ctx, input);
		}),
	create: protectedProcedure
		.input(createSalesSquareRefundSchema)
		.mutation(async ({ ctx, input }) => {
			requireSquareRefundFeatureEnabled();
			await requireAnyOperationalPermission(
				ctx,
				["editRefundSquare"],
				"You do not have permission to refund Square payments.",
			);
			return createSalesSquareRefundIntent(ctx, input);
		}),
	allocateExternal: protectedProcedure
		.input(allocateExternalSalesSquareRefundSchema)
		.mutation(async ({ ctx, input }) => {
			requireSquareRefundFeatureEnabled();
			await requireAnyOperationalPermission(
				ctx,
				["editRefundSquare"],
				"You do not have permission to allocate Square refunds.",
			);
			return allocateExternalSalesSquareRefund(ctx, input);
		}),
	retry: protectedProcedure
		.input(retrySalesSquareRefundSchema)
		.mutation(async ({ ctx, input }) => {
			requireSquareRefundFeatureEnabled();
			await requireAnyOperationalPermission(
				ctx,
				["editRefundSquare"],
				"You do not have permission to retry Square refunds.",
			);
			return retrySalesSquareRefund(input.refundId);
		}),
});
