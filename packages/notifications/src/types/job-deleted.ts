import type { NotificationHandler } from "../base";
import {
	type JobDeletedInput,
	type JobDeletedTags,
	jobDeletedSchema,
} from "../schemas";

export const jobDeleted: NotificationHandler = {
	schema: jobDeletedSchema,
	createActivity(data: JobDeletedInput, author) {
		const payload: JobDeletedTags = {
			type: "job_deleted",
			source: "user",
			priority: 5,
			jobId: data.jobId,
		};

		return {
			type: "job_deleted",
			source: "user",
			subject: "Job deleted",
			headline: `Job #${data.jobId} deleted by ${author.name}.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
