import type { NotificationHandler } from "../base";
import { type JobRejectedTags, jobRejectedSchema } from "../schemas";

export const jobRejected: NotificationHandler = {
  schema: jobRejectedSchema,
  createActivity(data, author) {
    const payload: JobRejectedTags = {
      type: "job_rejected",
      source: "user",
      priority: 5,
      jobId: data.jobId,
      contractorId: data.contractorId,
      note: data.note,
    };

    return {
      type: "job_rejected",
      source: "user",
      subject: "Job rejected",
      headline: `Job #${data.jobId} has been rejected.`,
      note: data.note,
      authorId: author.id,
      tags: payload,
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
  createWhatsApp(data, author, user) {
    const reviewer = data.rejectedByName || author.name || "Reviewer";
    const note = data.note ? ` Note: ${data.note}` : "";
    return {
      message: `Job #${data.jobId} was rejected by ${reviewer}.${note}`,
    };
  },
};
