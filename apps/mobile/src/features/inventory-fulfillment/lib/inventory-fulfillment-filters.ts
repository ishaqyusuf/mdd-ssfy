import type { DeliveryOption } from "@gnd/utils/sales";
import {
	type InventoryFulfillmentMode,
	type InventoryFulfillmentStatus,
	backorderStatuses,
	fulfillmentDeliveryModes,
	partialShipmentStatuses,
} from "./inventory-fulfillment-model";

export type InventoryFulfillmentFilters = {
	q: string;
	statuses: InventoryFulfillmentStatus[];
	deliveryModes: DeliveryOption[];
	holdUntilComplete: boolean | null;
};

export const emptyInventoryFulfillmentFilters: InventoryFulfillmentFilters = {
	q: "",
	statuses: [],
	deliveryModes: [],
	holdUntilComplete: null,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function allowedCsv<T extends string>(
	value: string | undefined,
	allowed: readonly T[],
) {
	const valid = new Set(allowed);
	return (value?.split(",") || []).filter((entry): entry is T =>
		valid.has(entry as T),
	);
}

export function parseInventoryFulfillmentFilters(
	params: SearchParams,
	mode: InventoryFulfillmentMode,
): InventoryFulfillmentFilters {
	const hold = first(params.holdUntilComplete);
	return {
		q: first(params.q)?.trim() || "",
		statuses: allowedCsv(
			first(params.statuses),
			mode === "backorders" ? backorderStatuses : partialShipmentStatuses,
		),
		deliveryModes: allowedCsv(
			first(params.deliveryModes),
			fulfillmentDeliveryModes,
		),
		holdUntilComplete: hold === "true" ? true : hold === "false" ? false : null,
	};
}

export function serializeInventoryFulfillmentFilters(
	filters: InventoryFulfillmentFilters,
) {
	return {
		q: filters.q || undefined,
		statuses: filters.statuses.length ? filters.statuses.join(",") : undefined,
		deliveryModes: filters.deliveryModes.length
			? filters.deliveryModes.join(",")
			: undefined,
		holdUntilComplete:
			filters.holdUntilComplete === null
				? undefined
				: String(filters.holdUntilComplete),
	};
}

export function countInventoryFulfillmentFilters(
	filters: InventoryFulfillmentFilters,
) {
	return (
		(filters.q ? 1 : 0) +
		filters.statuses.length +
		filters.deliveryModes.length +
		(filters.holdUntilComplete === null ? 0 : 1)
	);
}
