import {
	getProductionDueDatePresentation,
	getProductionQueueBoundaries,
} from "@sales/production-date";

export function getSalesProductionSchedulePresentation(
	value: Date | string | null | undefined,
	now = new Date(),
) {
	const presentation = getProductionDueDatePresentation(value, { now });
	if (presentation.bucket === "unscheduled") {
		return { date: "Unscheduled", label: "Schedule required" };
	}
	const date = new Date(value!);
	const days = Math.round(
		(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
			getProductionQueueBoundaries({ now }).today.gte.getTime()) /
			86_400_000,
	);
	return {
		date: new Intl.DateTimeFormat("en-US", {
			timeZone: "UTC",
			month: "short",
			day: "numeric",
			year:
				date.getUTCFullYear() === now.getUTCFullYear() ? undefined : "numeric",
		}).format(date),
		label:
			presentation.bucket === "future" ? `In ${days} days` : presentation.label,
	};
}
