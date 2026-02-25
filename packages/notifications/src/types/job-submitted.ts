import type { NotificationHandler } from "../base";
import { jobSubmittedSchema } from "../schemas";

export const jobSubmitted: NotificationHandler = {
  schema: jobSubmittedSchema,
  createActivity(data, author) {
    return {
      type: "job_submitted",
      source: "user",
      subject: "Job submitted",
      headline: `Job #${data.jobId} has been submitted for review.`,
      authorId: author.id,
      tags: {
        jobId: data.jobId,
      },
    };
  },
};
