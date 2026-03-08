import type { NotificationHandler } from "../base";
import {
  type JobTaskConfigureRequestInput,
  type JobTaskConfigureRequestTags,
  jobTaskConfigureRequestSchema,
} from "../schemas";

export const jobTaskConfigureRequest: NotificationHandler = {
  schema: jobTaskConfigureRequestSchema,
  createActivity(data: JobTaskConfigureRequestInput, author) {
    const payload: JobTaskConfigureRequestTags = {
      type: "job_task_configure_request",
      source: "user",
      priority: 5,
      contractorId: data.contractorId,
      jobId: data.jobId,
      modelName: data.modelName,
      projectName: data.projectName,
      builderName: data.builderName,
      modelId: data.modelId,
      builderTaskId: data.builderTaskId,
    };

    return {
      type: "job_task_configure_request",
      source: "user",
      subject: "Install task list missing",
      headline: `${data.modelName} (${data.projectName}/${data.builderName}) cannot be submitted because install task list is missing.`,
      authorId: author.id,
      tags: payload,
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
        jobId: data.jobId,
        modelName: data.modelName,
        projectName: data.projectName,
        builderName: data.builderName,
        builderTaskId: data.builderTaskId,
        modelId: data.modelId,
      },
    };
  },
  createWhatsApp(data, author) {
    return {
      message:
        `${author.name} (contractor #${data.contractorId}) is trying to submit job #${data.jobId}, but install task list is missing. ` +
        `Model: ${data.modelName}, Project: ${data.projectName}, Builder: ${data.builderName}, ` +
        `ModelId: ${data.modelId}, BuilderTaskId: ${data.builderTaskId}.`,
    };
  },
};
