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
  public readonly channel: ReturnType<typeof createNotificationChannelTriggers>;

  constructor(
    private readonly tasks: TriggerTasksClient,
    private readonly ctx: NotificationServiceContext,
  ) {
    this.channel = createNotificationChannelTriggers({
      send: (channel, input) => this.emit(channel, input as any),
      getStoredRecipients: () => this.recipients,
    });
  }

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
    console.log("Emitting notification with payload:", payload);
    return this.tasks.trigger("notification", payload);
  }

  async send<TChannel extends NotificationJobInput["channel"]>(
    channel: TChannel,
    input: WithoutChannelAndAuthor<NotificationEvent<TChannel>>,
  ) {
    return this.emit(channel, input);
  }

  setEmployeeRecipients(...ids: number[]) {
    this.recipients = normalizeRecipients(makeRecipients("employee", ...ids));
    return this;
  }

  setCustomerRecipients(...ids: number[]) {
    this.recipients = normalizeRecipients(makeRecipients("customer", ...ids));
    return this;
  }

  setAddressRecipients(...ids: number[]) {
    this.recipients = normalizeRecipients(makeRecipients("address", ...ids));
    return this;
  }
}
