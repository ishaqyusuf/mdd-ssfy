import type { PreviewRecord } from "../data/sample-data";

export function getRecordSearchCopy(record: PreviewRecord): string {
  const parts = [
    record.id,
    record.title,
    record.subtitle,
    record.status,
    record.amount ?? "",
    record.action ?? "",
    ...record.meta.map((m) => m.label)
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}
