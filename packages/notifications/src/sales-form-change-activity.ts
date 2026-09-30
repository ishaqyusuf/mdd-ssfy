import type { Db, TransactionClient } from "@gnd/db";
import {
	parseSalesChangeRecord,
	summarizeSalesItemChanges,
	salesItemChangeCountLabel,
	type SalesItemChangeSummary,
} from "@gnd/sales/sales-change-history";

/** Batch the history lookup so a page of activities doesn't fetch each item separately. */
export async function attachSalesItemChangeSummaries<
	T extends {
		tags: Record<string, unknown>;
		headline: string | null;
		note: string | null;
	},
>(
	db: Db,
	activities: T[],
	allowedSalesIds?: number[],
): Promise<Array<T & { salesChangeSummary: SalesItemChangeSummary | null }>> {
	const candidates = activities.flatMap((activity) => {
		const { type, changeHistoryId, salesId } = activity.tags;
		return type === "sales_form_change" &&
			typeof changeHistoryId === "string" &&
			Number.isSafeInteger(Number(salesId)) &&
			Number(salesId) > 0 &&
			(!allowedSalesIds || allowedSalesIds.includes(Number(salesId)))
			? [{ id: changeHistoryId, salesId: Number(salesId) }]
			: [];
	});
	const references = [
		...new Map(
			candidates.map((reference) => [
				`${reference.salesId}:${reference.id}`,
				reference,
			]),
		).values(),
	];
	const histories = references.length
		? await db.salesHistory.findMany({
				where: { deletedAt: null, OR: references },
				select: { id: true, salesId: true, data: true },
			})
		: [];
	const summaries = new Map<string, SalesItemChangeSummary | null>(
		histories.map((history) => {
			const record = parseSalesChangeRecord(history.data);
			return [
				`${history.salesId}:${history.id}`,
				record ? summarizeSalesItemChanges(record.changes) : null,
			] as const;
		}),
	);
	return activities.map((activity) => {
		if (activity.tags.type !== "sales_form_change")
			return { ...activity, salesChangeSummary: null };
		const summary = summaries.get(
			`${activity.tags.salesId}:${activity.tags.changeHistoryId}`,
		) || { messages: ["Sale details updated"], itemCount: 0 };
		return {
			...activity,
			salesChangeSummary: summary,
			headline: summary.itemCount ? salesItemChangeCountLabel(summary) : null,
			note: null,
		};
	});
}

/** Updates the existing activity; retries never create another history/notification. */
export async function updateSalesFormChangeActivity(
	db: Db | TransactionClient,
	input: {
		adjustmentId: string;
		status: string;
		applicationFailed?: boolean;
	},
) {
	const activity = await db.notePad.findFirst({
		where: {
			deletedAt: null,
			AND: [
				{
					tags: {
						some: {
							tagName: "adjustmentId",
							tagValue: input.adjustmentId,
							deletedAt: null,
						},
					},
				},
				{
					tags: {
						some: {
							tagName: "type",
							tagValue: "sales_form_change",
							deletedAt: null,
						},
					},
				},
			],
		},
		select: {
			id: true,
			tags: {
				where: { deletedAt: null },
				select: { tagName: true, tagValue: true },
			},
		},
	});
	if (!activity) return false;
	const tags = Object.fromEntries(
		activity.tags.map((tag) => [tag.tagName, tag.tagValue]),
	);
	if (
		tags.changeStatus === input.status &&
		tags.applicationFailed === String(Boolean(input.applicationFailed))
	)
		return true;
	if (tags.changeHistoryId && tags.salesId) {
		await db.salesHistory.create({
			data: {
				salesId: Number(tags.salesId),
				name: "Sales change application",
				data: {
					event: "sales_form_change_lifecycle",
					schemaVersion: 1,
					changeHistoryId: tags.changeHistoryId,
					adjustmentId: input.adjustmentId,
					status: input.status,
					applicationFailed: Boolean(input.applicationFailed),
					eventAt: new Date().toISOString(),
				},
			},
		});
	}
	for (const [tagName, tagValue] of [
		["changeStatus", input.status],
		["applicationFailed", String(Boolean(input.applicationFailed))],
	]) {
		await db.noteTags.deleteMany({
			where: { notePadId: activity.id, tagName },
		});
		await db.noteTags.create({
			data: { notePadId: activity.id, tagName, tagValue },
		});
	}
	if (
		input.status === "APPLIED" ||
		input.status === "APPLIED_WITH_REVIEW" ||
		input.applicationFailed
	) {
		await db.noteRecipients.updateMany({
			where: {
				notePadId: activity.id,
				deletedAt: null,
				status: { not: "archived" },
			},
			data: { status: "unread" },
		});
	}
	return true;
}
