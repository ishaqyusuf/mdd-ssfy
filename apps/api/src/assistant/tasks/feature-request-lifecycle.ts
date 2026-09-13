import { db } from "@gnd/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { analyzeAssistantFeatureRequest } from "../feature-analysis";
import { deliverAssistantFeatureNotification } from "../feature-notifications";
import { processNextAssistantFeatureAnalysis } from "../feature-requests";

export const ASSISTANT_FEATURE_ANALYSIS_BATCH_SIZE = 1;
export const ASSISTANT_FEATURE_NOTIFICATION_BATCH_SIZE = 25;

export async function drainAssistantFeatureAnalysisQueue() {
	let processed = 0;
	for (
		let index = 0;
		index < ASSISTANT_FEATURE_ANALYSIS_BATCH_SIZE;
		index += 1
	) {
		const result = await processNextAssistantFeatureAnalysis(
			db,
			analyzeAssistantFeatureRequest,
		);
		if (result.status === "idle" || result.status === "contended") break;
		processed += 1;
	}
	return { processed };
}

export async function drainAssistantFeatureNotificationQueue() {
	let processed = 0;
	for (
		let index = 0;
		index < ASSISTANT_FEATURE_NOTIFICATION_BATCH_SIZE;
		index += 1
	) {
		const result = await deliverAssistantFeatureNotification(db);
		if (result.status === "idle" || result.status === "contended") break;
		processed += 1;
	}
	return { processed };
}

export const assistantFeatureAnalysisSchedule = schedules.task({
	id: "assistant-feature-analysis",
	cron: "* * * * *",
	queue: { concurrencyLimit: 1 },
	run: drainAssistantFeatureAnalysisQueue,
});

export const assistantFeatureNotificationSchedule = schedules.task({
	id: "assistant-feature-notifications",
	cron: "* * * * *",
	queue: { concurrencyLimit: 1 },
	run: drainAssistantFeatureNotificationQueue,
});
