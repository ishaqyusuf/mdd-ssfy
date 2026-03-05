import type { NotificationHandler } from "../base";
import {
  type JobReviewRequestedTags,
  jobReviewRequestedSchema,
} from "../schemas";

export const jobReviewRequested: NotificationHandler = {
  schema: jobReviewRequestedSchema,
  createActivity(data, author) {
    const payload: JobReviewRequestedTags = {
      type: "job_review_requested",
      source: "user",
      priority: 5,
      jobId: data.jobId,
      requestedById: data.requestedById,
      requestedByName: data.requestedByName,
    };

    return {
      type: "job_review_requested",
      source: "user",
      subject: "Job review requested",
      headline: `Review was requested for job #${data.jobId}.`,
      authorId: author.id,
      tags: payload,
    };
  },
};
