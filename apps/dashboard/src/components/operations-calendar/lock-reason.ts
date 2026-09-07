import type { ScheduleMoveLockReason } from "@sales/schedule-move";

const labels: Record<ScheduleMoveLockReason, string> = {
  PERMISSION_DENIED: "You do not have permission to reschedule this work.",
  WORKER_CALENDAR_READ_ONLY: "Worker calendars are read-only.",
  NO_ACTIVE_SCHEDULE_RECORDS: "No active assignments are available to move.",
  PRODUCTION_GROUP_COMPLETED: "This group contains completed production work and cannot be moved together.",
  ORDER_FULFILLED: "This order is fulfilled and cannot be rescheduled.",
  ORDER_CANCELLED: "This order is cancelled.",
  DISPATCH_IN_PROGRESS: "Dispatch has started; its schedule is locked.",
  DISPATCH_COMPLETED: "This dispatch is completed.",
  DISPATCH_CANCELLED: "This dispatch is cancelled.",
  DISPATCH_DELETED: "This dispatch was deleted.",
  DISPATCH_STATUS_UNAVAILABLE: "Dispatch status is unavailable. Review it before rescheduling.",
  LIFECYCLE_CONFLICT: "Lifecycle evidence needs review before rescheduling.",
};

export function scheduleMoveLockLabel(reason?: ScheduleMoveLockReason | null) {
  return reason ? labels[reason] : "Schedule locked";
}
