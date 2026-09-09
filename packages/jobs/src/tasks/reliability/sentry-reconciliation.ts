import { db } from "@gnd/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { runConfiguredSentryReconciliation } from "../../reliability/configured-sentry";
import { reconcileSentrySource } from "../../reliability/reconcile-sentry";

export const sentryReliabilityReconciliation = schedules.task({
	id: "reliability-sentry-reconciliation",
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 300,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runConfiguredSentryReconciliation({
			env: process.env,
			environment: ctx.environment.type,
			now: () => new Date(),
			execute: (source, budget) =>
				reconcileSentrySource(db, source, { ...budget, now: () => new Date() }),
		}),
});

export const sentryReliabilityHistoricalSweep = schedules.task({
	id: "reliability-sentry-historical-sweep",
	cron: {
		pattern: "15 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 300,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runConfiguredSentryReconciliation({
			env: process.env,
			environment: ctx.environment.type,
			mode: "historical",
			now: () => new Date(),
			execute: (source, budget) =>
				reconcileSentrySource(db, source, { ...budget, now: () => new Date() }),
		}),
});
