import type { NotificationJobInput } from "../schemas";
import type { Db } from "@gnd/db";
import {
  createNotificationChannelTriggers,
  makeRecipients,
  normalizeRecipients,
} from "../payload-utils";

type NotificationEvent<TChannel extends NotificationJobInput["channel"]> =
  Extract<NotificationJobInput, { channel: TChannel }>;

type Author = NotificationJobInput["author"];

type TriggerTasksClient = {
  trigger: (taskId: string, payload: NotificationJobInput) => Promise<unknown>;
};

type NotificationServiceContext = {
  db: Db;
  userId?: number | null;
};

type WithoutChannelAndAuthor<T extends { channel: string; author: unknown }> =
  Omit<T, "channel" | "author"> & {
    author?: Author;
  };

export class NotificationService {
  private recipients: NotificationJobInput["recipients"] = null;

  constructor(
    private readonly tasks: TriggerTasksClient,
    private readonly ctx: NotificationServiceContext,
  ) {}

  private async buildAuthor(author?: Author): Promise<Author> {
    if (author) return author;
    const { db, userId } = this.ctx;
    if (!userId) {
      throw new Error(
        "NotificationService requires ctx.userId or explicit author.",
      );
    }
    const user = await db.users.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new Error(
        "NotificationService could not resolve author from ctx.userId.",
      );
    }
    return {
      id: user.id,
      role: "employee",
    };
  }

  private async emit<TChannel extends NotificationJobInput["channel"]>(
    channel: TChannel,
    input: WithoutChannelAndAuthor<NotificationEvent<TChannel>>,
  ) {
    const payload = {
      ...input,
      channel,
      author: await this.buildAuthor(input.author),
    } as NotificationEvent<TChannel>;

    return this.tasks.trigger("notification", payload);
  }

  async send<TChannel extends NotificationJobInput["channel"]>(
    channel: TChannel,
    input: WithoutChannelAndAuthor<NotificationEvent<TChannel>>,
  ) {
    return this.emit(channel, input);
  }

  private get channelTriggers() {
    return createNotificationChannelTriggers({
      send: (channel, input) => this.emit(channel, input as any),
      getStoredRecipients: () => this.recipients,
    });
  }

  setEmployeeRecipients(...ids: number[]) {
    this.recipients = normalizeRecipients(makeRecipients("employee", ...ids));
    return this;
  }

  setCustomerRecipients(...ids: number[]) {
    this.recipients = normalizeRecipients(makeRecipients("customer", ...ids));
    return this;
  }

  async jobAssigned(
    input: NotificationEvent<"job_assigned">["payload"] & {
      recipients?: NotificationEvent<"job_assigned">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobAssigned(input as any);
  }

  async jobSubmitted(
    input: NotificationEvent<"job_submitted">["payload"] & {
      recipients?: NotificationEvent<"job_submitted">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobSubmitted(input as any);
  }

  async jobApproved(
    input: NotificationEvent<"job_approved">["payload"] & {
      recipients?: NotificationEvent<"job_approved">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobApproved(input as any);
  }

  async jobRejected(
    input: NotificationEvent<"job_rejected">["payload"] & {
      recipients?: NotificationEvent<"job_rejected">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobRejected(input as any);
  }

  async jobReviewRequested(
    input: NotificationEvent<"job_review_requested">["payload"] & {
      recipients?: NotificationEvent<"job_review_requested">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobReviewRequested(input as any);
  }

  async jobTaskConfigureRequest(
    input: NotificationEvent<"job_task_configure_request">["payload"] & {
      recipients?: NotificationEvent<"job_task_configure_request">["recipients"];
      author?: Author;
    },
  ) {
    return this.channelTriggers.jobTaskConfigureRequest(input as any);
  }
}
