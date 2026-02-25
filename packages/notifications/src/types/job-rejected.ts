import type { NotificationHandler } from "../base";
import { jobRejectedSchema } from "../schemas";

export const jobRejected: NotificationHandler = {
  schema: jobRejectedSchema,
  createActivity(data, author) {
    return {
      type: "job_rejected",
      source: "user",
      subject: "Job rejected",
      headline: `Job #${data.jobId} has been rejected.`,
      note: data.note,
      authorId: author.id,
      tags: {
        jobId: data.jobId,
      },
    };
  },
  createEmail(data, author, user, args) {
    return {
      ...args,
      template: "job-rejected",
      to: [user.email],
      subject: `Job #${data.jobId} Rejected`,
      data: {
        recipientName: user.name,
        reviewerName: data.rejectedByName || author.name || "Reviewer",
        jobId: data.jobId,
        note: data.note || "",
      },
    };
  },
};
