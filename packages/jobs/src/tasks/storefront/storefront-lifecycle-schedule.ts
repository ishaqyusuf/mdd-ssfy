import { db } from "@gnd/db";
import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import { del, list } from "@vercel/blob";
import { storefrontLifecycleCutoffs } from "./lifecycle";

const EVENT_NAME = "storefront-lifecycle-schedule";

async function runStorefrontLifecycle() {
	const now = new Date();
	const cutoffs = storefrontLifecycleCutoffs(now);
	const staleDrafts = await db.storefrontInquiry.findMany({
		where: {
			status: "DRAFT",
			createdAt: { lte: cutoffs.deleteInquiryDraftAt },
		},
		orderBy: { createdAt: "asc" },
		take: 200,
		select: { id: true },
	});
	const blobToken =
		process.env.STOREFRONT_INQUIRY_BLOB_READ_WRITE_TOKEN ||
		process.env.BLOB_READ_WRITE_TOKEN;
	if (!blobToken && staleDrafts.length) {
		logger.error(
			"Stale inquiry drafts retained because private blob cleanup is not configured",
			{ draftCount: staleDrafts.length },
		);
	}
	const deletableDraftIds: string[] = [];
	for (const draft of staleDrafts) {
		if (!blobToken) continue;
		try {
			let cursor: string | undefined;
			do {
				const page = await list({
					prefix: `storefront-inquiries/${draft.id}/`,
					cursor,
					limit: 100,
					token: blobToken,
				});
				if (page.blobs.length) {
					await del(
						page.blobs.map((blob) => blob.url),
						{ token: blobToken },
					);
				}
				cursor = page.hasMore ? page.cursor : undefined;
			} while (cursor);
			deletableDraftIds.push(draft.id);
		} catch (error) {
			logger.error("Unable to clean up stale inquiry draft files", {
				inquiryId: draft.id,
				error,
			});
		}
	}
	const [abandoned, expiredCollections, expiredCheckouts, deletedTokens] =
		await db.$transaction([
			db.storefrontCommerceCollection.updateMany({
				where: {
					type: "CART",
					status: "ACTIVE",
					ownerUserId: null,
					updatedAt: { lte: cutoffs.abandonedCartAt },
				},
				data: { status: "ABANDONED" },
			}),
			db.storefrontCommerceCollection.updateMany({
				where: {
					status: { in: ["ACTIVE", "ABANDONED"] },
					expiresAt: { lte: now },
				},
				data: { status: "EXPIRED" },
			}),
			db.storefrontCheckout.updateMany({
				where: {
					status: { in: ["DRAFT", "READY", "PAYMENT_PENDING", "FAILED"] },
					expiresAt: { lte: now },
				},
				data: {
					status: "EXPIRED",
					errorCode: "CHECKOUT_EXPIRED",
					errorMessage: "The checkout expired before payment was confirmed.",
				},
			}),
			db.storefrontPasswordResetToken.deleteMany({
				where: {
					OR: [
						{ expiresAt: { lte: cutoffs.deleteRecoveryTokenAt } },
						{
							consumedAt: {
								not: null,
								lte: cutoffs.deleteRecoveryTokenAt,
							},
						},
					],
				},
			}),
		]);
	const deletedInquiryDrafts = deletableDraftIds.length
		? await db.storefrontInquiry.deleteMany({
				where: { id: { in: deletableDraftIds }, status: "DRAFT" },
			})
		: { count: 0 };

	const result = {
		abandonedCarts: abandoned.count,
		expiredCollections: expiredCollections.count,
		expiredCheckouts: expiredCheckouts.count,
		deletedRecoveryTokens: deletedTokens.count,
		deletedInquiryDrafts: deletedInquiryDrafts.count,
	};
	await db.scheduleHistory.create({
		data: {
			eventName: EVENT_NAME,
			value: Object.values(result).reduce((total, count) => total + count, 0),
			meta: result,
		},
	});
	logger.info("Storefront lifecycle maintenance completed", result);
	return result;
}

export const storefrontLifecycleSchedule = schedules.task({
	id: EVENT_NAME,
	cron: {
		pattern: "30 3 * * *",
		timezone: "America/New_York",
	},
	maxDuration: 300,
	queue: { concurrencyLimit: 1 },
	run: runStorefrontLifecycle,
});

export const runStorefrontLifecycleNow = task({
	id: "run-storefront-lifecycle-now",
	run: runStorefrontLifecycle,
});
