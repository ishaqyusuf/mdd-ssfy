import { type Prisma, db } from "@gnd/db";
import { createContractorAccountingReportRun } from "@gnd/db/queries";
import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import { getNextContractorAccountingReportRun } from "./schedule-next-run";

const SCHEDULE_LIMIT = 50;

export const contractorAccountingReportSchedule = schedules.task({
	id: "contractor-accounting-report-schedule",
	cron: "0 * * * *",
	maxDuration: 300,
	run: async () => {
		const now = new Date();
		const due = await db.contractorAccountingReportSchedule.findMany({
			where: {
				enabled: true,
				OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
			},
			orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
			take: SCHEDULE_LIMIT,
		});
		const results: Array<{
			scheduleId: string;
			runId?: string;
			taskId?: string;
			error?: string;
		}> = [];
		for (const schedule of due) {
			try {
				if (
					schedule.filters === null ||
					Array.isArray(schedule.filters) ||
					typeof schedule.filters !== "object"
				) {
					throw new Error("Scheduled report filters must be a JSON object.");
				}
				const nextRunAt = getNextContractorAccountingReportRun({
					cron: schedule.cron,
					timezone: schedule.timezone,
					after: now,
				});
				const run = await createContractorAccountingReportRun(db, {
					kind: schedule.kind,
					format: schedule.format,
					filters: schedule.filters as Prisma.InputJsonObject,
					requestedById: schedule.createdById,
					scheduleId: schedule.id,
				});
				const task = await tasks.trigger(
					"generate-contractor-accounting-report",
					{ runId: run.id },
				);
				await db.contractorAccountingReportSchedule.update({
					where: { id: schedule.id },
					data: { lastRunAt: now, nextRunAt },
				});
				results.push({
					scheduleId: schedule.id,
					runId: run.id,
					taskId: task.id,
				});
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Scheduled report dispatch failed.";
				logger.error("Contractor accounting report schedule failed", {
					scheduleId: schedule.id,
					error: message,
				});
				results.push({ scheduleId: schedule.id, error: message });
			}
		}
		return { evaluatedAt: now.toISOString(), results };
	},
});
