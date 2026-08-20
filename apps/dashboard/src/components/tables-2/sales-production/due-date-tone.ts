import dayjs from "@gnd/utils/dayjs";

const urgentDueDateClassName = "text-destructive";
const closeDueDateClassName = "text-amber-600 dark:text-amber-400";

export function getSalesProductionDueDateClassName(
	dueDate: string | Date | null | undefined,
	completed: boolean,
	now: string | Date = new Date(),
) {
	if (completed || !dueDate) return null;

	const parsedDueDate = dayjs(dueDate);
	if (!parsedDueDate.isValid()) return null;

	const daysUntilDue = parsedDueDate
		.startOf("day")
		.diff(dayjs(now).startOf("day"), "day");

	if (daysUntilDue <= 0) return urgentDueDateClassName;
	if (daysUntilDue <= 7) return closeDueDateClassName;

	return null;
}
