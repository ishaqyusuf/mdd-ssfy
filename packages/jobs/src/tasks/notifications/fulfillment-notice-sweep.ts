import { db } from "@gnd/db";
import { findPendingFulfillmentNoticeCommands } from "@gnd/sales/fulfillment-notification-pending";
import { schedules, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { TaskName } from "../../schema";

export const sweepFulfillmentNotices = schemaTask({
	id: "sweep-fulfillment-notices" satisfies TaskName,
	schema: z.object({ afterId: z.string().optional() }),
	queue: { concurrencyLimit: 1 },
	maxDuration: 120,
	retry: { maxAttempts: 3 },
	run: async ({ afterId }) => {
		const page = await findPendingFulfillmentNoticeCommands(db, { afterId });
		for (const requestId of page.requestIds) {
			await tasks.trigger(
				"deliver-fulfillment-notices",
				{ requestId },
				{
					idempotencyKey: `fulfillment-notice-sweep:${requestId}:${Math.floor(Date.now() / 300000)}`,
					idempotencyKeyTTL: "10m",
				},
			);
		}
		if (page.nextCursor) {
			await tasks.trigger("sweep-fulfillment-notices", {
				afterId: page.nextCursor,
			});
		}
		return { queued: page.requestIds.length, nextCursor: page.nextCursor };
	},
});

export const recoverFulfillmentNotices = schedules.task({
	id: "recover-fulfillment-notices",
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	run: async () => tasks.trigger("sweep-fulfillment-notices", {}),
});
