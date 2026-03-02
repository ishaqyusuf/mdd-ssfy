import type { NotificationHandler } from "../base";
import {
  type JobTaskConfigureRequestInput,
  jobTaskConfigureRequestSchema,
} from "../schemas";

export const jobTaskConfigureRequest: NotificationHandler = {
  schema: jobTaskConfigureRequestSchema,
  createActivity(data: JobTaskConfigureRequestInput, author) {
    return {
      type: "job_task_configure_request",
      source: "user",
      subject: "Install task list missing",
      headline: `${data.modelName} (${data.projectName}/${data.builderName}) cannot be submitted because install task list is missing.`,
      authorId: author.id,
      tags: {
        contractorId: data.contractorId,
        modelName: data.modelName,
        projectName: data.projectName,
        builderName: data.builderName,
      },
    };
  },
  createEmail(data, author, user, args) {
    return {
      ...args,
      template: "job-task-configure-request",
      to: [user.email],
      subject: "Contractor submission blocked: install task list missing",
      data: {
        recipientName: user.name,
        contractorName: author.name,
        contractorId: data.contractorId,
        modelName: data.modelName,
        projectName: data.projectName,
        builderName: data.builderName,
      },
    };
  },
  createWhatsApp(data, author) {
    return {
      message:
        `${author.name} (contractor #${data.contractorId}) is trying to submit a job, but install task list is missing. ` +
        `Model: ${data.modelName}, Project: ${data.projectName}, Builder: ${data.builderName}.`,
    };
  },
};
