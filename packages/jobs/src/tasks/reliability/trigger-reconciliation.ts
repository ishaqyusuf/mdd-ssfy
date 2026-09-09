import { db } from "@gnd/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { runConfiguredTriggerReconciliation } from "../../reliability/configured-trigger";
import { reconcileTriggerSource } from "../../reliability/reconcile-trigger";

export const triggerReliabilityHistoricalSweep = schedules.task({
	id: "reliability-trigger-historical-sweep",
	cron: {
		pattern: "35 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 300,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runConfiguredTriggerReconciliation({
			env: process.env,
			environment: ctx.environment.type,
			mode: "historical",
			now: () => new Date(),
			execute: (source, budget) =>
				reconcileTriggerSource(db, source, {
					...budget,
					now: () => new Date(),
				}),
		}),
});

export const triggerReliabilityReconciliation = schedules.task({
	id: "reliability-trigger-reconciliation",
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 300,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runConfiguredTriggerReconciliation({
			env: process.env,
			environment: ctx.environment.type,
			now: () => new Date(),
			execute: (source, budget) =>
				reconcileTriggerSource(db, source, {
					...budget,
					now: () => new Date(),
				}),
		}),
});
