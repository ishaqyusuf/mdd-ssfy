import { db } from "@gnd/db";
import { deliverFulfillmentNotices } from "@gnd/notifications/fulfillment-delivery";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { TaskName } from "../../schema";

export const deliverFulfillmentNoticesTask = schemaTask({
	id: "deliver-fulfillment-notices" satisfies TaskName,
	schema: z.object({ requestId: z.string().uuid() }),
	queue: { concurrencyLimit: 4 },
	retry: {
		maxAttempts: 8,
		factor: 2,
		minTimeoutInMs: 1000,
		maxTimeoutInMs: 60000,
	},
	run: async ({ requestId }) => deliverFulfillmentNotices(db, requestId),
});
