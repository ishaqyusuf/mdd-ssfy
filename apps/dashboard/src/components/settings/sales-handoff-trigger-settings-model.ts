import type {
	SalesHandoffTriggerInput,
	SalesHandoffTriggerPolicy,
} from "@gnd/settings";

export type SalesHandoffTriggerDraft = {
	mode: SalesHandoffTriggerInput["mode"];
	percentage: string;
};

export function toSalesHandoffTriggerDraft(
	settings: SalesHandoffTriggerPolicy,
): SalesHandoffTriggerDraft {
	return {
		mode: settings.mode,
		percentage: String(settings.percentage ?? 50),
	};
}

export function getSalesHandoffTriggerPercentageError(
	draft: SalesHandoffTriggerDraft,
) {
	if (draft.mode !== "PAYMENT_PERCENTAGE") return null;
	if (!/^\d+$/.test(draft.percentage.trim())) {
		return "Enter a whole-number payment percentage from 1 through 100.";
	}
	const percentage = Number(draft.percentage);
	return percentage >= 1 && percentage <= 100
		? null
		: "Enter a whole-number payment percentage from 1 through 100.";
}

export function toSalesHandoffTriggerInput(
	draft: SalesHandoffTriggerDraft,
): SalesHandoffTriggerInput {
	return {
		mode: draft.mode,
		percentage:
			draft.mode === "PAYMENT_PERCENTAGE" ? Number(draft.percentage) : null,
	};
}

export function hasSalesHandoffTriggerChanges(
	draft: SalesHandoffTriggerDraft,
	persisted: SalesHandoffTriggerPolicy,
) {
	const input = toSalesHandoffTriggerInput(draft);
	return (
		input.mode !== persisted.mode || input.percentage !== persisted.percentage
	);
}

const UTC_MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

export function formatSalesHandoffTriggerChangedAt(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown time";
	const hour = date.getUTCHours();
	const hour12 = hour % 12 || 12;
	const minute = String(date.getUTCMinutes()).padStart(2, "0");
	const meridiem = hour < 12 ? "AM" : "PM";
	return `${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} at ${hour12}:${minute} ${meridiem} UTC`;
}
