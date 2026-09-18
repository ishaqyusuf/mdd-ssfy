import { db } from "@gnd/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { deliverDueBugReportIssues } from "../../bug-reports/deliver-issue";

export const bugReportIssueDelivery = schedules.task({
	id: "bug-report-issue-delivery",
	cron: {
		pattern: "* * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	maxDuration: 120,
	retry: { maxAttempts: 1 },
	queue: { concurrencyLimit: 2 },
	run: async () =>
		deliverDueBugReportIssues(db, {
			now: () => new Date(),
		}),
});
