import type { NotificationHandler } from "../base";
import { jobReviewRequestedSchema } from "../schemas";

export const jobReviewRequested: NotificationHandler = {
  schema: jobReviewRequestedSchema,
  createActivity(data, author) {
    return {
      type: "job_review_requested",
      source: "user",
      subject: "Job review requested",
      headline: `Review was requested for job #${data.jobId}.`,
      authorId: author.id,
      tags: {
        jobId: data.jobId,
      },
    };
  },
};
