export const reminderPresetPayPlans = [25, 50, 75] as const;
export const reminderCompatibilityPayPlans = [
	...reminderPresetPayPlans,
	100,
] as const;

export type ReminderPresetPayPlan =
	(typeof reminderCompatibilityPayPlans)[number];

export type ReminderPayPlan =
	| ReminderPresetPayPlan
	| "full"
	| "custom"
	| "flexible";

type ResolveReminderAmountInput = {
	due: number;
	payPlan?: ReminderPayPlan | null;
	preferredAmount?: number | null;
	percentage?: number | null;
};

function roundMoney(value: number) {
	return Number(value.toFixed(2));
}

export function isReminderPayPlan(value: unknown): value is ReminderPayPlan {
	return (
		typeof value === "number" ||
		value === "full" ||
		value === "custom" ||
		value === "flexible"
	);
}

export function normalizeReminderPayPlan(input: {
	payPlan?: unknown;
	percentage?: number | null;
}): ReminderPayPlan | null {
	if (isReminderPayPlan(input.payPlan)) {
		return input.payPlan;
	}

	if (typeof input.percentage === "number") {
		return input.percentage as ReminderPayPlan;
	}

	return null;
}

export function resolveReminderAmount({
	due,
	payPlan,
	preferredAmount,
	percentage,
}: ResolveReminderAmountInput) {
	const safeDue = Number.isFinite(due) ? Math.max(0, due) : 0;
	const normalizedPayPlan = normalizeReminderPayPlan({
		payPlan,
		percentage,
	});

	if (
		normalizedPayPlan === "custom" &&
		typeof preferredAmount === "number" &&
		Number.isFinite(preferredAmount) &&
		preferredAmount > 0
	) {
		return roundMoney(Math.min(preferredAmount, safeDue));
	}

	if (typeof normalizedPayPlan === "number") {
		return roundMoney((safeDue * normalizedPayPlan) / 100);
	}

	if (normalizedPayPlan === "full") {
		return roundMoney(safeDue);
	}

	return 0;
}

export function resolveReminderPlanLabel(input: {
	payPlan?: ReminderPayPlan | null;
	percentage?: number | null;
	preferredAmount?: number | null;
	amount?: number | null;
}) {
	const normalizedPayPlan = normalizeReminderPayPlan(input);

	if (normalizedPayPlan === "full" || normalizedPayPlan === 100) {
		return "Full balance";
	}

	if (normalizedPayPlan === "custom") {
		return "Custom amount";
	}

	if (normalizedPayPlan === "flexible") {
		return "Flexible amount";
	}

	if (typeof normalizedPayPlan === "number") {
		return `${normalizedPayPlan}% payment`;
	}

	if (typeof input.preferredAmount === "number" && input.preferredAmount > 0) {
		return "Custom amount";
	}

	if (typeof input.amount === "number" && input.amount > 0) {
		return "Payment request";
	}

	return "Payment";
}
