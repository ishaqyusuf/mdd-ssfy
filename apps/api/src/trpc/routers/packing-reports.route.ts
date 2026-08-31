import {
	decidePackingReport,
	decidePackingReports,
	getPackingReportContext,
	submitPackingReport,
} from "@api/db/queries/packing-reports";
import { auth } from "@api/db/queries/user";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import {
	authorizePackingReportActor,
	authorizePackingReportReviewer,
	packingReportReviewerCapability,
} from "@api/utils/packing-report-authority";
import { sendPackingReportNotification } from "@api/utils/packing-report-notification";
import {
	PackingReportError,
	decidePackingReportSchema,
	decidePackingReportsSchema,
	packingReportContextSchema,
	submitPackingReportSchema,
} from "@gnd/sales/packing-report-review";
import { TRPCError } from "@trpc/server";

import {
	type TRPCContext,
	createTRPCRouter,
	protectedProcedure,
} from "../init";

function packingReportTrpcError(error: unknown): never {
	if (!(error instanceof PackingReportError)) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				process.env.NODE_ENV === "production"
					? "Guarded packing could not be saved. Your quantities remain selected; retry or contact dispatch support."
					: error instanceof Error
						? error.message
						: "Guarded packing could not be saved.",
			cause: error,
		});
	}
	const code =
		error.code === "FORBIDDEN"
			? "FORBIDDEN"
			: error.code === "STALE_SCOPE"
				? "PRECONDITION_FAILED"
				: error.code === "NOT_REPORTABLE" || error.code === "PHYSICAL_SHORTAGE"
					? "PRECONDITION_FAILED"
					: "CONFLICT";
	throw new TRPCError({ code, message: error.message, cause: error });
}

async function requirePackingActor(
	ctx: TRPCContext & { userId: number },
	dispatchId: number,
) {
	const session = await auth(ctx);
	const dispatch = await ctx.db.orderDelivery.findFirst({
		where: { id: dispatchId, deletedAt: null },
		select: { driverId: true },
	});
	try {
		const authority = authorizePackingReportActor(
			{ userId: ctx.userId, can: session.can },
			dispatch?.driverId ?? null,
		);
		return { session, authority };
	} catch (error) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				error instanceof Error ? error.message : "Packing access denied.",
		});
	}
}

async function requirePackingReviewer(ctx: TRPCContext) {
	const session = await requireAnyOperationalPermission(
		ctx,
		["viewPacking", "editPickup", "editOrders"],
		"You do not have permission to review packing reports.",
	);
	authorizePackingReportReviewer({ userId: ctx.userId, can: session.can });
	return session;
}

export const packingReportsRouter = createTRPCRouter({
	context: protectedProcedure
		.input(packingReportContextSchema)
		.query(async ({ ctx, input }) => {
			const { session } = await requirePackingActor(ctx, input.dispatchId);
			try {
				const context = await getPackingReportContext(ctx.db, input.dispatchId);
				return {
					...context,
					reviewerCapability: packingReportReviewerCapability({
						userId: ctx.userId,
						can: session.can,
					}),
				};
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
	submit: protectedProcedure
		.input(submitPackingReportSchema)
		.mutation(async ({ ctx, input }) => {
			const { authority } = await requirePackingActor(ctx, input.dispatchId);
			try {
				const result = await submitPackingReport(ctx.db, input, {
					id: authority.actorUserId,
					scope: authority.scope,
				});
				if (!result.idempotentReplay) {
					await sendPackingReportNotification(
						ctx,
						result.reportId,
						"PENDING",
						authority.actorUserId,
					);
				}
				return result;
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
	decide: protectedProcedure
		.input(decidePackingReportSchema)
		.mutation(async ({ ctx, input }) => {
			const session = await requirePackingReviewer(ctx);
			try {
				const result = await decidePackingReport(ctx.db, input, {
					id: ctx.userId,
					name: session.name || "Packing reviewer",
				});
				if (!result.idempotentReplay) {
					await sendPackingReportNotification(
						ctx,
						result.reportId,
						result.status,
						ctx.userId,
						session.name || "Packing reviewer",
					);
				}
				return result;
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
	decideBatch: protectedProcedure
		.input(decidePackingReportsSchema)
		.mutation(async ({ ctx, input }) => {
			const session = await requirePackingReviewer(ctx);
			try {
				const result = await decidePackingReports(ctx.db, input, {
					id: ctx.userId,
					name: session.name || "Packing reviewer",
				});
				const decided = result.results.find((item) => !item.idempotentReplay);
				if (decided) {
					await sendPackingReportNotification(
						ctx,
						decided.reportId,
						decided.status,
						ctx.userId,
						session.name || "Packing reviewer",
					);
				}
				return result;
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
});
