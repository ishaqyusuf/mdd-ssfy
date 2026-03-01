import type { NotificationRecipient, NotificationRecipients } from "./types";

function sanitizeIds(ids: number[]) {
  return Array.from(
    new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0)),
  );
}

export function makeRecipients(
  role: NotificationRecipient["role"],
  ...ids: number[]
) {
  const uniqueIds = sanitizeIds(ids);
  return uniqueIds.length ? [{ ids: uniqueIds, role }] : [];
}

export function normalizeRecipients(recipients?: NotificationRecipients) {
  if (!recipients?.length) return null;

  const cleaned = recipients
    .map((recipient) => ({
      role: recipient.role || "employee",
      ids: sanitizeIds(recipient.ids || []),
    }))
    .filter((recipient) => recipient.ids.length > 0);

  return cleaned.length ? cleaned : null;
}

