import { db } from "@gnd/db";
import { listDueGithubRecoveries } from "@gnd/db/queries";
import { schedules } from "@trigger.dev/sdk/v3";
import { recoverConfiguredGithubDelivery } from "../../reliability/configured-github-recovery";
import { runGithubRecoveryBatch } from "../../reliability/github-recovery-batch";

export const githubReliabilityRecovery = schedules.task({
	id: "reliability-github-recovery",
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 180,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runGithubRecoveryBatch({
			env: process.env,
			environment: ctx.environment.type,
			now: () => new Date(),
			select: (serviceIds, now, limit) =>
				listDueGithubRecoveries(db, { serviceIds, now, limit }),
			execute: (deliveryId, serviceId) =>
				recoverConfiguredGithubDelivery(db, {
					deliveryId,
					serviceId,
					env: process.env,
					environment: ctx.environment.type,
					now: () => new Date(),
				}),
		}),
});
