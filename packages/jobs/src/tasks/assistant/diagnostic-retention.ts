import { db } from "@gnd/db";
import { purgeExpiredAssistantDiagnostics } from "@gnd/db/queries";
import { schedules } from "@trigger.dev/sdk/v3";

export async function runAssistantDiagnosticRetention(
	purge: (now: Date) => Promise<number> = (now) =>
		purgeExpiredAssistantDiagnostics(db, now),
	now = new Date(),
) {
	let deleted = 0;
	for (let batch = 0; batch < 10; batch++) {
		const count = await purge(now);
		deleted += count;
		if (count < 200) return { deleted, moreMayRemain: false };
	}
	return { deleted, moreMayRemain: true };
}

export const assistantDiagnosticRetention = schedules.task({
	id: "assistant-diagnostic-retention",
	cron: "17 * * * *",
	run: async () => runAssistantDiagnosticRetention(),
});
