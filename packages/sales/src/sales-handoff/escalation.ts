export const SALES_HANDOFF_ESCALATION_TIME_ZONE = "America/New_York";

export type SalesHandoffInitialExposureMilestone =
	| "QUALIFICATION"
	| "POLICY_CHANGE";

type ZonedDateTimeParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

function zonedParts(date: Date): ZonedDateTimeParts {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: SALES_HANDOFF_ESCALATION_TIME_ZONE,
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
	const hour = value("hour");
	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: hour === 24 ? 0 : hour,
		minute: value("minute"),
		second: value("second"),
	};
}

function addLocalDays(
	date: Pick<ZonedDateTimeParts, "year" | "month" | "day">,
	days: number,
) {
	const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
	return {
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
	};
}

function localWeekday(
	parts: Pick<ZonedDateTimeParts, "year" | "month" | "day">,
) {
	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function zonedTimeToUtc(parts: ZonedDateTimeParts) {
	const desired = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);
	let candidate = new Date(desired);
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const rendered = zonedParts(candidate);
		const renderedUtc = Date.UTC(
			rendered.year,
			rendered.month - 1,
			rendered.day,
			rendered.hour,
			rendered.minute,
			rendered.second,
		);
		const correction = desired - renderedUtc;
		if (!correction) return candidate;
		candidate = new Date(candidate.getTime() + correction);
	}
	return candidate;
}

export function nextSalesHandoffBusinessDay(openedAt: Date) {
	const opened = zonedParts(openedAt);
	let next = addLocalDays(opened, 1);
	while (localWeekday(next) === 0 || localWeekday(next) === 6) {
		next = addLocalDays(next, 1);
	}
	return zonedTimeToUtc({
		...next,
		hour: opened.hour,
		minute: opened.minute,
		second: opened.second,
	});
}

function validDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function deriveSalesHandoffOpenedAt(input: {
	now: Date;
	qualifiedAt?: string | Date | null;
	policyChangedAt?: string | Date | null;
	hasPreviousEpoch: boolean;
	initialExposureMilestone?: SalesHandoffInitialExposureMilestone | null;
}) {
	if (input.hasPreviousEpoch) return input.now;
	const candidates = (
		input.initialExposureMilestone === "QUALIFICATION"
			? [validDate(input.qualifiedAt)]
			: input.initialExposureMilestone === "POLICY_CHANGE"
				? [validDate(input.qualifiedAt), validDate(input.policyChangedAt)]
				: []
	).filter((value): value is Date => Boolean(value));
	const latest = candidates.reduce<Date | null>(
		(current, candidate) =>
			!current || candidate.getTime() > current.getTime() ? candidate : current,
		null,
	);
	return latest && latest.getTime() <= input.now.getTime() ? latest : input.now;
}
