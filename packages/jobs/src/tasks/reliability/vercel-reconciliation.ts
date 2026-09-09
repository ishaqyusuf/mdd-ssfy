import { db } from "@gnd/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { runConfiguredVercelReconciliation } from "../../reliability/configured-vercel";
import { withIsolatedVercelConfig } from "../../reliability/isolated-vercel-config";
import { readVercelQuery } from "../../reliability/read-vercel-query";
import { reconcileVercelSource } from "../../reliability/reconcile-vercel";
import { resolveVercelRuntime } from "../../reliability/vercel-runtime";

export const vercelReliabilityReconciliation = schedules.task({
	id: "reliability-vercel-reconciliation",
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 300,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 1 },
	run: async (_payload, { ctx }) =>
		runConfiguredVercelReconciliation({
			env: process.env,
			environment: ctx.environment.type,
			now: () => new Date(),
			resolveRuntime: resolveVercelRuntime,
			execute: (source, runtime, budget) =>
				withIsolatedVercelConfig((configDirectory) =>
					reconcileVercelSource(
						db,
						source,
						{ ...budget, now: () => new Date() },
						(window) =>
							readVercelQuery(source, window, new Date(), {
								...runtime,
								configDirectory,
							}),
					),
				),
		}),
});
