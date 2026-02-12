import { NotificationHandler } from "../base";
import { jobAssignedSchema } from "../schemas";

export const jobAssigned: NotificationHandler = {
  schema: jobAssignedSchema,
  createActivity(data, user) {
    return {
      type: "job_assigned",
      priority: 5,
      sendEmail: false,
      source: "user",
      tags: {
        jobId: data.jobId,
      },
      subject: "Job assigned",
    };
  },
  // createEmail(data, user) {

  // },
};
