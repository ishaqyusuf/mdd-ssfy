import {
	decidePackingReport,
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
import {
	PackingReportError,
	decidePackingReportSchema,
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
	if (!(error instanceof PackingReportError)) throw error;
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
				return await submitPackingReport(ctx.db, input, {
					id: authority.actorUserId,
					scope: authority.scope,
				});
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
	decide: protectedProcedure
		.input(decidePackingReportSchema)
		.mutation(async ({ ctx, input }) => {
			const session = await requirePackingReviewer(ctx);
			try {
				return await decidePackingReport(ctx.db, input, {
					id: ctx.userId,
					name: session.name || "Packing reviewer",
				});
			} catch (error) {
				packingReportTrpcError(error);
			}
		}),
});
