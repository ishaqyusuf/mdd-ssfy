import type { PageFilterOption } from "@api/type";
import { sortList, uniqueList } from "@gnd/utils";
import {
	getDeliveryFilterOptionColor,
	getPaymentFilterOptionColor,
	getStatusFilterOptionColor,
} from "@gnd/utils/filter-option-colors";

export function toDealershipFilterOptions(
	values: Array<string | null | undefined>,
) {
	const options = values
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value));

	return uniqueList(
		sortList(
			options.map((value) => ({ label: value, value })),
			"value",
		),
		"value",
	);
}

export function withDealershipStatusColors(
	options: PageFilterOption<string>[],
) {
	return options.map((option) => ({
		...option,
		color: getStatusFilterOptionColor(option.value),
	}));
}

export function withDealershipDeliveryColors(
	options: PageFilterOption<string>[],
) {
	return options.map((option) => ({
		...option,
		label: DELIVERY_OPTION_LABELS[option.value] || option.label,
		color: getDeliveryFilterOptionColor(option.value),
	}));
}

export const dealershipPaymentStateOptions = [
	{
		label: "Balance due",
		value: "due",
		color: getPaymentFilterOptionColor("due"),
	},
	{
		label: "Paid",
		value: "paid",
		color: getPaymentFilterOptionColor("paid"),
	},
	{
		label: "Credit",
		value: "credit",
		color: getPaymentFilterOptionColor("credit"),
	},
] satisfies PageFilterOption<string>[];

const DELIVERY_OPTION_LABELS: Record<string, string> = {
	pickup: "Pickup",
	delivery: "Delivery",
	ship: "Ship",
};
