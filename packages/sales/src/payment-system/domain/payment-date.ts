export const SALES_PAYMENT_BUSINESS_TIME_ZONE = "America/New_York";

type PaymentDateParts = {
	day: number;
	hour: number;
	minute: number;
	month: number;
	second: number;
	year: number;
};

function paymentDateParts(value: Date, timeZone: string): PaymentDateParts {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-US", {
			day: "2-digit",
			hour: "2-digit",
			hourCycle: "h23",
			minute: "2-digit",
			month: "2-digit",
			second: "2-digit",
			timeZone,
			year: "numeric",
		})
			.formatToParts(value)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	) as Record<string, number | undefined>;
	const part = (name: keyof PaymentDateParts) => {
		const resolved = parts[name];
		if (resolved == null || Number.isNaN(resolved)) {
			throw new Error(`Unable to resolve payment ${name} in ${timeZone}.`);
		}
		return resolved;
	};

	return {
		day: part("day"),
		hour: part("hour"),
		minute: part("minute"),
		month: part("month"),
		second: part("second"),
		year: part("year"),
	};
}

function parsePaymentDateOnly(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error("Payment date must use YYYY-MM-DD.");
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		throw new Error("Payment date must be a valid calendar date.");
	}
	return { day, month, year };
}

function timezoneOffsetMs(value: Date, timeZone: string) {
	const parts = paymentDateParts(value, timeZone);
	return (
		Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hour,
			parts.minute,
			parts.second,
		) - value.getTime()
	);
}

function zonedPaymentDate(
	date: { day: number; month: number; year: number },
	time: Pick<PaymentDateParts, "hour" | "minute" | "second">,
	timeZone: string,
) {
	const nominalUtc = Date.UTC(
		date.year,
		date.month - 1,
		date.day,
		time.hour,
		time.minute,
		time.second,
	);
	const firstOffset = timezoneOffsetMs(new Date(nominalUtc), timeZone);
	let resolved = new Date(nominalUtc - firstOffset);
	const resolvedOffset = timezoneOffsetMs(resolved, timeZone);
	if (resolvedOffset !== firstOffset) {
		resolved = new Date(nominalUtc - resolvedOffset);
	}
	return resolved;
}

export function getSalesPaymentBusinessDate(
	value: Date = new Date(),
	timeZone = SALES_PAYMENT_BUSINESS_TIME_ZONE,
) {
	const parts = paymentDateParts(value, timeZone);
	return [
		parts.year,
		String(parts.month).padStart(2, "0"),
		String(parts.day).padStart(2, "0"),
	].join("-");
}

export function isValidSalesPaymentDate(value: string) {
	try {
		parsePaymentDateOnly(value);
		return true;
	} catch {
		return false;
	}
}

export type SalesPaymentOccurrence = {
	occurredAt: Date;
	paymentDate: string;
	recordedAt: Date;
	source: "recorded_now" | "staff_selected_date";
};

export function resolveSalesPaymentOccurrence({
	now = new Date(),
	paymentDate,
	timeZone = SALES_PAYMENT_BUSINESS_TIME_ZONE,
}: {
	now?: Date;
	paymentDate?: string | null;
	timeZone?: string;
} = {}): SalesPaymentOccurrence {
	const currentBusinessDate = getSalesPaymentBusinessDate(now, timeZone);
	if (!paymentDate) {
		return {
			occurredAt: now,
			paymentDate: currentBusinessDate,
			recordedAt: now,
			source: "recorded_now",
		};
	}
	const parsed = parsePaymentDateOnly(paymentDate);
	if (paymentDate > currentBusinessDate) {
		throw new Error("Payment date cannot be in the future.");
	}
	const currentTime = paymentDateParts(now, timeZone);
	return {
		occurredAt:
			paymentDate === currentBusinessDate
				? now
				: zonedPaymentDate(parsed, currentTime, timeZone),
		paymentDate,
		recordedAt: now,
		source: "staff_selected_date",
	};
}
