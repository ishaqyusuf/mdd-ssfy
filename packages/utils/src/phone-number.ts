export const US_PHONE_FORMAT_PATTERN = /^\d{3}-\d{3}-\d{4}$/;

export function getPhoneDigits(value?: string | null) {
	return String(value || "").replace(/\D/g, "");
}

export function formatUSPhoneNumber(value?: string | null) {
	const digits = getPhoneDigits(value);
	const nationalDigits =
		digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

	if (nationalDigits.length !== 10) return String(value || "").trim();

	return `${nationalDigits.slice(0, 3)}-${nationalDigits.slice(
		3,
		6,
	)}-${nationalDigits.slice(6)}`;
}

export function normalizeUSPhoneNumber(value?: string | null) {
	const trimmed = String(value || "").trim();
	if (!trimmed) return undefined;

	return formatUSPhoneNumber(trimmed);
}

export function isPhoneLikeSearch(value?: string | null) {
	const digits = getPhoneDigits(value);
	return digits.length >= 7;
}
