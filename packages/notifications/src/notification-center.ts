import {
  type DispatchPackingDelayTags,
  type JobTaskConfigureRequestTags,
  dispatchPackingDelayTags,
  jobTaskConfigureRequestTags,
} from "./schemas";

export type RawNotificationItem = {
  id: string | number;
  subject?: string | null;
  headline?: string | null;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
  receipt?: {
    status?: "unread" | "read" | "archived" | null;
  } | null;
  tags?: Record<string, unknown> | null;
};

type NotificationActionPayloadMap = {
  job_task_configure_request: Omit<JobTaskConfigureRequestTags, "type">;
  dispatch_packing_delay: Omit<DispatchPackingDelayTags, "type">;
};

export type NotificationActionType = keyof NotificationActionPayloadMap;

export type NotificationAction<
  TType extends NotificationActionType = NotificationActionType,
> = {
  type: TType;
  label: string;
  data: NotificationActionPayloadMap[TType];
};

export type TransformedNotification<
  TType extends NotificationActionType = NotificationActionType,
> = {
  id: string | number;
  type: string;
  title: string;
  description: string;
  createdAt?: string | Date | null;
  notificationDate: string | null;
  status: "unread" | "read" | "archived";
  isClickable: boolean;
  action?: NotificationAction<TType>;
  tags: Record<string, unknown>;
};

export type NotificationActionHandlers<TContext = void> = {
  [K in NotificationActionType]?: (
    data: NotificationActionPayloadMap[K],
    notification: TransformedNotification<K>,
    context: TContext,
  ) => void | Promise<void>;
};

export function createNotificationHandlers<TContext = void>(
  handlers: NotificationActionHandlers<TContext>,
) {
  return handlers;
}

function parseType(tags: Record<string, unknown>) {
  const type = tags.type ?? tags.channel;
  return typeof type === "string" ? type : "unknown";
}

function statusFromRaw(
  raw: RawNotificationItem,
): "unread" | "read" | "archived" {
  const status = raw.receipt?.status;
  if (status === "unread" || status === "read" || status === "archived") {
    return status;
  }
  return "read";
}

function parseAction(
  tags: Record<string, unknown>,
): NotificationAction | undefined {
  const type = parseType(tags);
  console.log(type);
  if (type === "job_task_configure_request") {
    const parsed = jobTaskConfigureRequestTags.safeParse(tags);
    if (!parsed.success) return undefined;
    return {
      type: "job_task_configure_request",
      label: "Configure",
      data: parsed.data,
    };
  }

  if (type === "dispatch_packing_delay") {
    const parsed = dispatchPackingDelayTags.safeParse(tags);
    if (!parsed.success) return undefined;
    return {
      type: "dispatch_packing_delay",
      label: "Approve",
      data: parsed.data,
    };
  }

  return undefined;
}

function formatNotificationDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function transformNotifications(
  items: RawNotificationItem[],
): TransformedNotification[] {
  return items.map((item) => {
    const tags = item.tags ?? {};
    const type = parseType(tags);
    const action = parseAction(tags);
    const createdAt = item.createdAt ?? item.created_at ?? null;
    // console.log("Transforming notifications:", { action, tags });

    return {
      id: item.id,
      type,
      title: item.subject || "Notification",
      description: item.headline || "No details available.",
      createdAt,
      notificationDate: formatNotificationDate(createdAt),
      status: statusFromRaw(item),
      isClickable: Boolean(action),
      action,
      tags,
    };
  });
}

export async function runNotificationAction<TContext>(
  notification: TransformedNotification,
  handlers: NotificationActionHandlers<TContext>,
  context: TContext,
) {
  if (!notification.action) return;
  const handler = handlers[notification.action.type];
  if (!handler) return;

  await handler(
    notification.action.data as never,
    notification as never,
    context,
  );
}
