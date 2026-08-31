const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type OrderDueDateMap = Record<string, string>;

export function todayDateInput(now = new Date()) {
	return [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	].join("-");
}

export function toDateInput(value?: Date | string | null) {
	if (!value) return "";
	if (typeof value === "string") {
		const dateOnly = value.match(DATE_INPUT_PATTERN)?.[0];
		if (dateOnly) return dateOnly;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return todayDateInput(date);
}

export function parseDateInput(value: string) {
	if (!DATE_INPUT_PATTERN.test(value)) {
		throw new Error("Choose a valid delivery date.");
	}
	const date = new Date(`${value}T12:00:00`);
	if (Number.isNaN(date.getTime())) {
		throw new Error("Choose a valid delivery date.");
	}
	return date;
}

export function formatDeliveryDate(value?: string | null) {
	if (!value || !DATE_INPUT_PATTERN.test(value)) return "Set date";
	const [year, month, day] = value.split("-").map(Number);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(year, month - 1, day));
}

export function reconcileOrderDueDates(
	salesIds: number[],
	current: OrderDueDateMap,
	fallback = todayDateInput(),
	preferred: OrderDueDateMap = {},
) {
	return Object.fromEntries(
		salesIds.map((salesId) => [
			String(salesId),
			current[salesId] || preferred[salesId] || fallback,
		]),
	);
}

export function getEffectiveDeliveryDate(
	individualDueDate: string,
	overrideDueDate?: string | null,
) {
	return overrideDueDate || individualDueDate;
}

export function buildDispatchOrderDates(
	salesIds: number[],
	orderDueDates: OrderDueDateMap,
) {
	return salesIds.map((salesId) => ({
		salesId,
		dueDate: parseDateInput(orderDueDates[salesId] || ""),
	}));
}
