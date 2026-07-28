import dayjs from "./dayjs";

export type DateFilterInput =
	| string
	| readonly (string | null | undefined)[]
	| null
	| undefined;

export type DateFilterQuery = {
	gte?: string;
	lte?: string;
};

export type CompleteMonthFilterMode = "before" | "last";

export function getCompleteMonthDateQuery(
	months: number,
	mode: CompleteMonthFilterMode,
	referenceDate: string | number | Date = new Date(),
): DateFilterQuery | null {
	if (!Number.isSafeInteger(months) || months < 1) return null;

	const reference = dayjs(referenceDate);
	if (!reference.isValid()) return null;

	if (mode === "before") {
		return {
			lte: reference
				.subtract(months + 1, "month")
				.endOf("month")
				.toISOString(),
		};
	}

	return {
		gte: reference.subtract(months, "month").startOf("month").toISOString(),
		lte: reference.subtract(1, "month").endOf("month").toISOString(),
	};
}

export function parseCompleteMonthPreset(
	value: string,
	referenceDate: string | number | Date = new Date(),
): DateFilterQuery | undefined {
	const normalized = value.toLowerCase().trim();

	if (normalized === "last month") {
		return getCompleteMonthDateQuery(1, "last", referenceDate) ?? undefined;
	}

	if (normalized === "before last month") {
		return getCompleteMonthDateQuery(1, "before", referenceDate) ?? undefined;
	}

	const match = normalized.match(/^(before last|last) ([1-9]\d*) months?$/);
	if (!match) return undefined;

	const months = Number(match[2]);
	const mode = match[1] === "before last" ? "before" : "last";

	return getCompleteMonthDateQuery(months, mode, referenceDate) ?? undefined;
}
