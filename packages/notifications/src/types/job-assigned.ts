import { NotificationHandler } from "src/base";
import { jobAssignedSchema } from "src/schemas";

export const jobAssigned: NotificationHandler = {
  schema: jobAssignedSchema,
  createActivity(data, user) {
    return {
      type: "job_assigned",
      priority: 5,
      sendEmail: false,
      source: "user",
      tags: {},
      // authorId: user.id,
      // userIds: []
      // userIds: [user.id],
      // metadata: {
      //   id: data.jobId,
      //   note: data.comment,
      // },
      // source: "user",
      // priority: 5,
    };
  },
};
