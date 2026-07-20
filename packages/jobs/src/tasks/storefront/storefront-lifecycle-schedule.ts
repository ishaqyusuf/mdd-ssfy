import { db } from "@gnd/db";
import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import { storefrontLifecycleCutoffs } from "./lifecycle";

const EVENT_NAME = "storefront-lifecycle-schedule";

async function runStorefrontLifecycle() {
	const now = new Date();
	const cutoffs = storefrontLifecycleCutoffs(now);
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

	const result = {
		abandonedCarts: abandoned.count,
		expiredCollections: expiredCollections.count,
		expiredCheckouts: expiredCheckouts.count,
		deletedRecoveryTokens: deletedTokens.count,
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
