import type { NotificationHandler } from "../base";
import { type JobSubmittedTags, jobSubmittedSchema } from "../schemas";

export const jobSubmitted: NotificationHandler = {
  schema: jobSubmittedSchema,
  createActivity(data, author) {
    const payload: JobSubmittedTags = {
      type: "job_submitted",
      source: "user",
      priority: 5,
      jobId: data.jobId,
    };

    return {
      type: "job_submitted",
      source: "user",
      subject: "Job submitted",
      headline: `Job #${data.jobId} submitted by ${author.name}.`,
      authorId: author.id,
      tags: payload,
    };
  },
};
