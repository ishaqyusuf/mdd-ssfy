import type { NotificationHandler } from "../base";
import { jobApprovedSchema } from "../schemas";

export const jobApproved: NotificationHandler = {
  schema: jobApprovedSchema,
  createActivity(data, author) {
    return {
      type: "job_approved",
      source: "user",
      subject: "Job approved",
      headline: `Job #${data.jobId} has been approved.`,
      authorId: author.id,
      tags: {
        jobId: data.jobId,
      },
    };
  },
  createEmail(data, author, user, args) {
    return {
      ...args,
      template: "job-approved",
      to: [user.email],
      subject: `Job #${data.jobId} Approved`,
      data: {
        recipientName: user.name,
        reviewerName: data.approvedByName || author.name || "Reviewer",
        jobId: data.jobId,
      },
    };
  },
  createWhatsApp(data, author, user) {
    return {
      message: `Job #${data.jobId} was approved by ${data.approvedByName || author.name || "Reviewer"}.`,
    };
  },
};
