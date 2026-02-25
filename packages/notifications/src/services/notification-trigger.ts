import type { NotificationJobInput } from "../schemas";
import type { Db } from "@gnd/db";

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
type Recipient = NonNullable<NotificationJobInput["recipients"]>[number];

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

  private makeRecipients(
    role: Recipient["role"],
    ...ids: number[]
  ): Recipient[] {
    const uniqueIds = Array.from(
      new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0)),
    );
    return uniqueIds.length
      ? [{ ids: uniqueIds, role }]
      : [];
  }

  setEmployeeRecipients(...ids: number[]) {
    this.recipients = this.makeRecipients("employee", ...ids);
    return this;
  }

  setCustomerRecipients(...ids: number[]) {
    this.recipients = this.makeRecipients("customer", ...ids);
    return this;
  }

  async jobApproved(
    input: NotificationEvent<"job_approved">["payload"] & {
      recipients?: NotificationEvent<"job_approved">["recipients"];
      author?: Author;
    },
  ) {
    const { recipients, author, ...payload } = input;
    return this.emit("job_approved", {
      payload,
      author,
      recipients:
        recipients && recipients.length
          ? recipients
          : this.recipients && this.recipients.length
            ? this.recipients
            : this.makeRecipients("employee", payload.assignedToId),
    });
  }

  async jobRejected(
    input: NotificationEvent<"job_rejected">["payload"] & {
      recipients?: NotificationEvent<"job_rejected">["recipients"];
      author?: Author;
    },
  ) {
    const { recipients, author, ...payload } = input;
    return this.emit("job_rejected", {
      payload,
      author,
      recipients:
        recipients && recipients.length
          ? recipients
          : this.recipients && this.recipients.length
            ? this.recipients
            : this.makeRecipients("employee", payload.assignedToId),
    });
  }
}
