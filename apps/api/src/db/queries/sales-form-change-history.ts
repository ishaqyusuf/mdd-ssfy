import type { TRPCContext } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { assertDealerSaleOfficeAccess } from "@gnd/db/queries";
import {
	buildSalesChanges,
	parseSalesChangeRecord,
	summarizeSalesItemChanges,
	salesItemChangeCountLabel,
	type SalesChangeRecord,
} from "@gnd/sales/sales-change-history";
import { getSubscribersForNotificationType } from "@notifications/channel-subscribers";
import { TRPCError } from "@trpc/server";
import { createSalesFormTimelineActivity } from "./sales-form-activity";

type ActivityDb = Parameters<typeof createSalesFormTimelineActivity>[0];

export async function getSalesChangeHistoryAccess(
	ctx: TRPCContext,
	salesIds: number[],
) {
	if (!ctx.userId || !salesIds.length) return [];
	let session: Awaited<ReturnType<typeof requireAnyOperationalPermission>>;
	try {
		session = await requireAnyOperationalPermission(
			ctx,
			["viewOrders", "viewEstimates"],
			"You do not have permission to view sales change history.",
		);
	} catch (error) {
		if (
			error instanceof TRPCError &&
			["FORBIDDEN", "UNAUTHORIZED"].includes(error.code)
		)
			return [];
		throw error;
	}
	const sales = await ctx.db.salesOrders.findMany({
		where: { id: { in: salesIds }, deletedAt: null },
		select: { id: true, type: true, dealerAuthId: true },
	});
	const allowed = await Promise.all(
		sales.map(async (sale) => {
			if (!session.can[sale.type === "quote" ? "viewEstimates" : "viewOrders"])
				return null;
			if (sale.dealerAuthId) {
				try {
					await assertDealerSaleOfficeAccess(ctx.db, ctx.userId!, sale.id);
				} catch (error) {
					if (
						error instanceof Error &&
						error.message ===
							"Dealer sale is not available to this office user."
					)
						return null;
					if (
						error instanceof TRPCError &&
						["FORBIDDEN", "UNAUTHORIZED"].includes(error.code)
					)
						return null;
					throw error;
				}
			}
			return sale.id;
		}),
	);
	return allowed.filter((id): id is number => id !== null);
}

export async function recordSalesFormChanges(
	db: ActivityDb,
	input: {
		salesId: number;
		orderId: string;
		salesType: "order" | "quote";
		actorUserId: number;
		senderContactId: number;
		before: unknown;
		after: unknown;
		sourceVersion?: string | null;
		targetVersion?: string | null;
		adjustmentId?: string | null;
		reason?: string | null;
		autosave?: boolean;
	},
) {
	const changes = buildSalesChanges(input.before, input.after);
	if (!changes.length) return null;
	const data: SalesChangeRecord = {
		event: "sales_form_change",
		schemaVersion: 1,
		actorUserId: input.actorUserId,
		adjustmentId: input.adjustmentId || null,
		sourceVersion: input.sourceVersion || null,
		targetVersion: input.targetVersion || null,
		reason: input.reason || null,
		changes,
	};
	const history = await db.salesHistory.create({
		data: { salesId: input.salesId, name: "Sales form changes", data },
		select: { id: true },
	});
	const document = input.salesType === "quote" ? "Quote" : "Sale";
	const action = input.adjustmentId
		? "changes approved"
		: input.autosave
			? "autosaved"
			: "updated";
	const summary = summarizeSalesItemChanges(changes);
	const subscribers = input.autosave
		? []
		: await getSubscribersForNotificationType(db, "sales_info");
	const activity = await createSalesFormTimelineActivity(db, {
		salesId: input.salesId,
		orderId: input.orderId,
		senderContactId: input.senderContactId,
		copy: {
			subject: `${document} ${action}`,
			headline: `${document} ${input.orderId}: ${salesItemChangeCountLabel(summary)}.`,
			note: summary.messages.join("\n"),
			activityType: "sales_form_change",
		},
		changeHistoryId: history.id,
		adjustmentId: input.adjustmentId,
		salesType: input.salesType,
		changeCount: summary.itemCount,
		// Autosaves are retained in history without generating bell alerts.
		recipientContactIds: input.autosave
			? []
			: [
					input.senderContactId,
					...subscribers
						.filter((subscriber) => subscriber.inAppNotification)
						.map((subscriber) => subscriber.id),
				],
	});
	return { historyId: history.id, activityId: activity.id };
}

export async function getSalesFormChangeHistory(
	ctx: TRPCContext,
	input: { salesId: number; activityId: number },
) {
	const session = await requireAnyOperationalPermission(
		ctx,
		["viewOrders", "viewEstimates"],
		"You do not have permission to view sales change history.",
	);
	const sale = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: { id: true, dealerAuthId: true, type: true },
	});
	if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
	if (!session.can[sale.type === "quote" ? "viewEstimates" : "viewOrders"])
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to view this sales document.",
		});
	if (sale.dealerAuthId)
		await assertDealerSaleOfficeAccess(ctx.db, ctx.userId!, sale.id);
	const activity = await ctx.db.notePad.findFirst({
		where: {
			id: input.activityId,
			deletedAt: null,
			tags: {
				some: {
					tagName: "salesId",
					tagValue: String(sale.id),
					deletedAt: null,
				},
			},
		},
		select: {
			createdAt: true,
			senderContact: { select: { profileId: true, name: true } },
			tags: {
				where: { deletedAt: null },
				select: { tagName: true, tagValue: true },
			},
		},
	});
	const historyId = activity?.tags.find(
		(tag) => tag.tagName === "changeHistoryId",
	)?.tagValue;
	if (!activity || !historyId)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Change history is unavailable for this activity.",
		});
	const history = await ctx.db.salesHistory.findFirst({
		where: { id: historyId, salesId: sale.id, deletedAt: null },
		select: { data: true },
	});
	const record = parseSalesChangeRecord(history?.data);
	if (!record) throw new TRPCError({ code: "NOT_FOUND" });
	const [adjustment, actor, lifecycle] = await Promise.all([
		record.adjustmentId
			? ctx.db.salesOrderAdjustment.findFirst({
					where: { id: record.adjustmentId, salesOrderId: sale.id },
					select: {
						status: true,
						submittedAt: true,
						approvedAt: true,
						appliedAt: true,
						failedAt: true,
						failureCode: true,
					},
				})
			: null,
		ctx.db.users.findFirst({
			where: { id: record.actorUserId },
			select: { name: true },
		}),
		record.adjustmentId
			? ctx.db.salesHistory.findMany({
					where: {
						salesId: sale.id,
						deletedAt: null,
						name: "Sales change application",
						data: { path: "$.changeHistoryId", equals: historyId },
					},
					orderBy: { createdAt: "asc" },
					take: 100,
					select: { id: true, data: true },
				})
			: [],
	]);
	return {
		...record,
		lifecycle: lifecycle
			.map((entry) => {
				const data = entry.data as {
					status?: string;
					applicationFailed?: boolean;
					eventAt?: string;
				} | null;
				return {
					id: entry.id,
					status: data?.status || "UNAVAILABLE",
					applicationFailed: Boolean(data?.applicationFailed),
					at: data?.eventAt || "",
				};
			})
			.sort((a, b) => a.at.localeCompare(b.at)),
		authorName: actor?.name || activity.senderContact?.name || "Unknown",
		createdAt: activity.createdAt,
		status:
			adjustment?.status || (record.adjustmentId ? "UNAVAILABLE" : "APPLIED"),
		approvedAt: adjustment?.approvedAt || null,
		appliedAt: adjustment?.appliedAt || null,
		failedAt: adjustment?.failedAt || null,
		applicationFailed: Boolean(adjustment?.failureCode),
		failureCode: adjustment?.failureCode || null,
	};
}
