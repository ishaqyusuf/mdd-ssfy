import type { NotificationHandler } from "../base";
import {
  jobAssignedSchema,
  type JobAssignedTags,
  type JobAssignedInput,
} from "../schemas";

export const jobAssigned: NotificationHandler = {
  schema: jobAssignedSchema,
  createActivity(data: JobAssignedInput, author, user) {
    const payload: JobAssignedTags = {
      id: data.jobId,
      assignedToId: data.assignedToId,
      assignedToName: data.assignedToName,
      type: "job_assigned",
      priority: 5,
      source: "user",
      authorContactId: author.id,
      authorContactName: author.name,
    };

    return {
      type: "job_assigned",
      priority: 5,
      sendEmail: false,
      source: "user",
      authorId: author.id,
      subject: "Job assigned",
      tags: payload,
    };
  },
  createEmail(data, author, user, args) {
    const payload: JobAssignedTags = {
      id: data.jobId,
      assignedToId: data.assignedToId,
      assignedToName: data.assignedToName,
      type: "job_assigned",
      priority: 5,
      source: "user",
      authorContactId: author.id,
      authorContactName: author.name,
    };

    return {
      ...args,
      template: "job-assigned",
      to: [user.email],
      subject: `New Job Assigned #${data.jobId}`,
      data: payload,
    };
  },
  createWhatsApp(data, author, user) {
    return {
      message: `New job assigned (#${data.jobId}) by ${author.name}.`,
    };
  },
};
