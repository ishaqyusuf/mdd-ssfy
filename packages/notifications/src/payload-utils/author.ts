import type { NotificationAuthor } from "./types";

export function resolveNotificationAuthor(input: {
  author?: NotificationAuthor;
  authUserId?: number | null;
}) {
  const explicitAuthor = input.author;
  if (explicitAuthor?.id) return explicitAuthor;

  if (input.authUserId && Number.isSafeInteger(input.authUserId)) {
    return {
      id: input.authUserId,
      role: "employee" as const,
    };
  }

  throw new Error(
    "Notification author is required. Provide author or auth user id.",
  );
}

