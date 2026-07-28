const BUSINESS_TIME_ZONE = "America/New_York";

export function formatBusinessDate(
	value: Date | string | null | undefined,
): string | null {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: BUSINESS_TIME_ZONE,
	}).format(date);
}
