export type ReportWindow = "today" | "previous_day";

export type DailyPaymentsReportPeriodInput = {
	now: Date;
	timezone: string;
	reportWindow: ReportWindow;
	dateFrom?: string | null;
	dateTo?: string | null;
};

function formatDateForFile(date: Date, timezone: string) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function getTimeZoneParts(date: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(date);

	const value = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value || 0);

	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: value("hour") === 24 ? 0 : value("hour"),
		minute: value("minute"),
		second: value("second"),
	};
}

function zonedTimeToUtc(
	input: {
		year: number;
		month: number;
		day: number;
		hour?: number;
		minute?: number;
		second?: number;
	},
	timezone: string,
) {
	const utcGuess = new Date(
		Date.UTC(
			input.year,
			input.month - 1,
			input.day,
			input.hour || 0,
			input.minute || 0,
			input.second || 0,
		),
	);
	const parts = getTimeZoneParts(utcGuess, timezone);
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);
	const desiredUtc = Date.UTC(
		input.year,
		input.month - 1,
		input.day,
		input.hour || 0,
		input.minute || 0,
		input.second || 0,
	);
	return new Date(utcGuess.getTime() + desiredUtc - asUtc);
}

function addLocalDays(
	date: { year: number; month: number; day: number },
	days: number,
) {
	const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
	return {
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
	};
}

function parseLocalDate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		throw new Error(`Invalid report date: ${value}`);
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const normalized = new Date(Date.UTC(year, month - 1, day));
	if (
		normalized.getUTCFullYear() !== year ||
		normalized.getUTCMonth() !== month - 1 ||
		normalized.getUTCDate() !== day
	) {
		throw new Error(`Invalid report date: ${value}`);
	}

	return { year, month, day };
}

export function resolveDailyPaymentsReportPeriod(
	input: DailyPaymentsReportPeriodInput,
) {
	const hasExplicitDate = Boolean(input.dateFrom || input.dateTo);

	if (hasExplicitDate) {
		if (!input.dateFrom || !input.dateTo) {
			throw new Error(
				"Both dateFrom and dateTo are required for a manual report run",
			);
		}
		if (input.dateTo < input.dateFrom) {
			throw new Error("dateTo cannot be before dateFrom");
		}

		const fromDate = parseLocalDate(input.dateFrom);
		const toDate = parseLocalDate(input.dateTo);
		const from = zonedTimeToUtc(fromDate, input.timezone);
		const nextStart = zonedTimeToUtc(addLocalDays(toDate, 1), input.timezone);
		const to = new Date(nextStart.getTime() - 1000);
		const reportDate =
			input.dateFrom === input.dateTo
				? input.dateFrom
				: `${input.dateFrom}-to-${input.dateTo}`;

		return {
			from,
			to,
			reportDate,
			isExplicitRange: true,
		};
	}

	const today = getTimeZoneParts(input.now, input.timezone);
	const reportDate =
		input.reportWindow === "previous_day"
			? addLocalDays(today, -1)
			: { year: today.year, month: today.month, day: today.day };
	const nextDate = addLocalDays(reportDate, 1);
	const from = zonedTimeToUtc(reportDate, input.timezone);
	const nextStart = zonedTimeToUtc(nextDate, input.timezone);

	return {
		from,
		to: new Date(nextStart.getTime() - 1000),
		reportDate: formatDateForFile(from, input.timezone),
		isExplicitRange: false,
	};
}

export { formatDateForFile, getTimeZoneParts, zonedTimeToUtc, addLocalDays };
