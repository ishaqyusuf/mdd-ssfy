const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeCustomerPhoneNumber(
	value: string | null | undefined,
	defaultCountryCode = "1",
) {
	const raw = value?.trim();
	if (!raw) return null;

	if (raw.startsWith("+")) {
		const normalized = `+${raw.slice(1).replace(/\D/g, "")}`;
		return E164_PATTERN.test(normalized) ? normalized : null;
	}

	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	const countryCode = defaultCountryCode.replace(/\D/g, "");
	const normalized =
		digits.length === 10 && countryCode
			? `+${countryCode}${digits}`
			: `+${digits}`;

	return E164_PATTERN.test(normalized) ? normalized : null;
}

export function isValidCustomerPhoneNumber(
	value: string | null | undefined,
	defaultCountryCode = "1",
) {
	return Boolean(normalizeCustomerPhoneNumber(value, defaultCountryCode));
}
