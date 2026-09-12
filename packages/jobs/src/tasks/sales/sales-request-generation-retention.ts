import { db } from "@gnd/db";
import {
	SALES_REQUEST_GENERATION_RETENTION_DAYS,
	type SalesRequestTelemetryPurgeDatabase,
	purgeExpiredSalesRequestGenerationRuns,
} from "@gnd/db/queries";
import { logger, schedules } from "@trigger.dev/sdk/v3";

export const SALES_REQUEST_GENERATION_RETENTION_TASK_ID =
	"sales-request-generation-retention-purge";

export const SALES_REQUEST_GENERATION_RETENTION_CRON = {
	pattern: "17 2 * * *",
	timezone: "UTC",
} as const;

export async function runSalesRequestGenerationRetentionPurge(
	database: SalesRequestTelemetryPurgeDatabase,
	now = new Date(),
) {
	const result = await purgeExpiredSalesRequestGenerationRuns(database, now);
	const summary = {
		purgedCount: result.count,
		retentionDays: SALES_REQUEST_GENERATION_RETENTION_DAYS,
	};

	logger.info(
		"Sales Request Generation telemetry retention purge completed",
		summary,
	);
	return summary;
}

export const salesRequestGenerationRetentionPurge = schedules.task({
	id: SALES_REQUEST_GENERATION_RETENTION_TASK_ID,
	cron: SALES_REQUEST_GENERATION_RETENTION_CRON,
	maxDuration: 60,
	queue: { concurrencyLimit: 1 },
	run: () => runSalesRequestGenerationRetentionPurge(db),
});
