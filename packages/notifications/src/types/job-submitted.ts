import { NotificationHandler } from "../base";
import { jobSubmittedSchema } from "../schemas";

export const jobSubmitted: NotificationHandler = {
  schema: jobSubmittedSchema,
  createActivity(data) {
    return {
      type: "job_submitted",
      source: "user",
      subject: "Job submitted",
      headline: `Job #${data.jobId} has been submitted for review.`,
      tags: {
        jobId: data.jobId,
      },
    };
  },
};
