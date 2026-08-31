export const PRODUCTION_BUSINESS_TIME_ZONE = "America/New_York";

export type ProductionCalendarDate = {
	year: number;
	month: number;
	day: number;
};

type ProductionDateOptions = {
	now?: Date;
	timeZone?: string;
};

function assertCalendarDate(parts: ProductionCalendarDate) {
	const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
	if (
		value.getUTCFullYear() !== parts.year ||
		value.getUTCMonth() !== parts.month - 1 ||
		value.getUTCDate() !== parts.day
	) {
		throw new Error("Production due date must be a valid calendar date.");
	}
	return value;
}

function parseCalendarDate(value: string): ProductionCalendarDate {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error("Production due date must use YYYY-MM-DD.");
	const parts = {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	};
	assertCalendarDate(parts);
	return parts;
}

function formatCalendarDate(parts: ProductionCalendarDate) {
	return [
		parts.year,
		String(parts.month).padStart(2, "0"),
		String(parts.day).padStart(2, "0"),
	].join("-");
}

function datePartsInTimeZone(value: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(value);
	const read = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value || 0);
	return { year: read("year"), month: read("month"), day: read("day") };
}

function utcDateParts(value: Date) {
	return {
		year: value.getUTCFullYear(),
		month: value.getUTCMonth() + 1,
		day: value.getUTCDate(),
	};
}

function addCalendarDays(parts: ProductionCalendarDate, days: number) {
	return utcDateParts(
		new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days)),
	);
}

function dayNumber(parts: ProductionCalendarDate) {
	return Math.floor(
		Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000,
	);
}

/** Store UI calendar selections as date-only values without timezone drift. */
export function createProductionDueDate(parts: ProductionCalendarDate) {
	assertCalendarDate(parts);
	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

export function productionCalendarPartsFromLocalDate(value: Date) {
	return {
		year: value.getFullYear(),
		month: value.getMonth() + 1,
		day: value.getDate(),
	};
}

export function getProductionDateRange(value: string) {
	const parts = parseCalendarDate(value);
	const next = addCalendarDays(parts, 1);
	return {
		gte: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)),
		lt: new Date(Date.UTC(next.year, next.month - 1, next.day)),
	};
}

export function getProductionQueueBoundaries(
	options: ProductionDateOptions = {},
) {
	const now = options.now ?? new Date();
	const timeZone = options.timeZone ?? PRODUCTION_BUSINESS_TIME_ZONE;
	const todayParts = datePartsInTimeZone(now, timeZone);
	const tomorrowParts = addCalendarDays(todayParts, 1);
	const today = getProductionDateRange(formatCalendarDate(todayParts));
	const tomorrow = getProductionDateRange(formatCalendarDate(tomorrowParts));
	return {
		today,
		tomorrow,
		pastDue: { lt: today.gte },
		future: { gte: tomorrow.gte },
	};
}

export function getProductionDueDatePresentation(
	dueDate: Date | string | null | undefined,
	options: ProductionDateOptions = {},
) {
	if (!dueDate) {
		return { bucket: "unscheduled" as const, label: "No due date" };
	}
	const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
	if (Number.isNaN(due.getTime())) {
		return { bucket: "unscheduled" as const, label: "No due date" };
	}
	const now = options.now ?? new Date();
	const timeZone = options.timeZone ?? PRODUCTION_BUSINESS_TIME_ZONE;
	const difference =
		dayNumber(utcDateParts(due)) - dayNumber(datePartsInTimeZone(now, timeZone));
	if (difference === 0) return { bucket: "today" as const, label: "Today" };
	if (difference === 1) {
		return { bucket: "tomorrow" as const, label: "Tomorrow" };
	}
	if (difference === -1) {
		return { bucket: "past-due" as const, label: "Yesterday" };
	}
	if (difference < -1) {
		return {
			bucket: "past-due" as const,
			label: `${Math.abs(difference)} days overdue`,
		};
	}
	return {
		bucket: "future" as const,
		label: new Intl.DateTimeFormat("en-US", {
			timeZone: "UTC",
			month: "short",
			day: "numeric",
		}).format(due),
	};
}
