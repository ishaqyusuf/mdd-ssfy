export const DEFAULT_DISPATCH_TIME_ZONE = "America/New_York";

export type DispatchDueBucket =
	| "overdue"
	| "today"
	| "tomorrow"
	| "upcoming"
	| "unscheduled";

type DueDateOptions = {
	now?: Date;
	timeZone?: string;
};

function dateParts(value: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(value);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((entry) => entry.type === type)?.value || 0);
	return { year: part("year"), month: part("month"), day: part("day") };
}

function dayNumber(value: Date, timeZone: string) {
	const { year, month, day } = dateParts(value, timeZone);
	return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function zonedMidnightUtc(
	date: { year: number; month: number; day: number },
	timeZone: string,
) {
	const target = Date.UTC(date.year, date.month - 1, date.day);
	let candidate = target;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
		}).formatToParts(new Date(candidate));
		const read = (type: Intl.DateTimeFormatPartTypes) =>
			Number(parts.find((entry) => entry.type === type)?.value || 0);
		const represented = Date.UTC(
			read("year"),
			read("month") - 1,
			read("day"),
			read("hour"),
			read("minute"),
			read("second"),
		);
		candidate = target - (represented - candidate);
	}
	return new Date(candidate);
}

export function getDispatchDateBoundaries(options: DueDateOptions = {}) {
	const now = options.now ?? new Date();
	const timeZone = options.timeZone ?? DEFAULT_DISPATCH_TIME_ZONE;
	const current = dateParts(now, timeZone);
	const calendarDay = (offset: number) => {
		const value = new Date(
			Date.UTC(current.year, current.month - 1, current.day + offset),
		);
		return {
			year: value.getUTCFullYear(),
			month: value.getUTCMonth() + 1,
			day: value.getUTCDate(),
		};
	};
	return {
		startToday: zonedMidnightUtc(calendarDay(0), timeZone),
		startTomorrow: zonedMidnightUtc(calendarDay(1), timeZone),
		startAfterTomorrow: zonedMidnightUtc(calendarDay(2), timeZone),
	};
}

function parseDueDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function getDispatchDueBucket(
	dueDate: Date | string | null | undefined,
	options: DueDateOptions = {},
): DispatchDueBucket {
	const due = parseDueDate(dueDate);
	if (!due) return "unscheduled";
	const now = options.now ?? new Date();
	const timeZone = options.timeZone ?? DEFAULT_DISPATCH_TIME_ZONE;
	const difference = dayNumber(due, timeZone) - dayNumber(now, timeZone);
	if (difference < 0) return "overdue";
	if (difference === 0) return "today";
	if (difference === 1) return "tomorrow";
	return "upcoming";
}

export function getDispatchDuePresentation(
	dueDate: Date | string | null | undefined,
	options: DueDateOptions = {},
) {
	const due = parseDueDate(dueDate);
	const now = options.now ?? new Date();
	const timeZone = options.timeZone ?? DEFAULT_DISPATCH_TIME_ZONE;
	const bucket = getDispatchDueBucket(due, { now, timeZone });
	if (!due) {
		return {
			bucket,
			dateLabel: "Delivery date not scheduled",
			statusLabel: "Schedule required",
		};
	}
	const dateLabel = `Delivery due ${new Intl.DateTimeFormat("en-US", {
		timeZone,
		month: "short",
		day: "numeric",
	}).format(due)}`;
	const difference = dayNumber(due, timeZone) - dayNumber(now, timeZone);
	const statusLabel =
		bucket === "overdue"
			? `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"} overdue`
			: bucket === "today"
				? "Due today"
				: bucket === "tomorrow"
					? "Due tomorrow"
					: "Upcoming delivery";
	return { bucket, dateLabel, statusLabel };
}

export function summarizeDriverWorkQueue(
	rows: ReadonlyArray<{
		dueDate?: Date | string | null;
		status?: string | null;
	}>,
	options: DueDateOptions = {},
) {
	const byDueBucket: Record<DispatchDueBucket, number> = {
		overdue: 0,
		today: 0,
		tomorrow: 0,
		upcoming: 0,
		unscheduled: 0,
	};
	const byStatus: Record<string, number> = {};
	for (const row of rows) {
		byDueBucket[getDispatchDueBucket(row.dueDate, options)] += 1;
		const status = row.status?.trim();
		if (status) byStatus[status] = (byStatus[status] || 0) + 1;
	}
	return {
		total: rows.length,
		inProgress: byStatus["in progress"] || 0,
		byDueBucket,
		byStatus,
	};
}
