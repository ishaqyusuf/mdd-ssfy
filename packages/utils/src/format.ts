type FormatAmountParams = {
	currency: string;
	amount: number;
	locale?: string;
	minimumFractionDigits?: number;
	maximumFractionDigits?: number;
};

export function formatAmount({
	currency,
	amount,
	locale = "en-US",
	minimumFractionDigits,
	maximumFractionDigits,
}: FormatAmountParams) {
	if (!currency) {
		return;
	}

	return Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(amount);
}
export const formatCurrency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD", // Replace with your desired currency code
});

export function formatLargeNumber(num: number, digits = 1): string {
	if (num === null || num === undefined) {
		return "0";
	}

	const lookup = [
		{ value: 1, symbol: "" },
		{ value: 1e3, symbol: "k" },
		{ value: 1e6, symbol: "m" },
		{ value: 1e9, symbol: "b" },
		{ value: 1e12, symbol: "t" },
		{ value: 1e15, symbol: "p" },
		{ value: 1e18, symbol: "e" },
	];
	const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	const item = lookup
		.slice()
		.reverse()
		.find((item) => num >= item.value);

	if (item && item.symbol !== "") {
		return (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol;
	}

	return num.toString();
}

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
