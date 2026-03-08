import type { NotificationHandler } from "../base";
import {
	type JobTaskConfiguredInput,
	type JobTaskConfiguredTags,
	jobTaskConfiguredSchema,
} from "../schemas";

export const jobTaskConfigured: NotificationHandler = {
	schema: jobTaskConfiguredSchema,
	createActivity(data: JobTaskConfiguredInput, author) {
		const payload: JobTaskConfiguredTags = {
			type: "job_task_configured",
			source: "user",
			priority: 5,
			contractorId: data.contractorId,
			jobId: data.jobId,
		};

		return {
			type: "job_task_configured",
			source: "user",
			subject: "Job task configured",
			headline: `Job task configuration has been completed for job #${data.jobId}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Job task configuration is completed for job #${data.jobId}.`,
		};
	},
};
