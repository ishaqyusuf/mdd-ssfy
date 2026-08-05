import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsBoolean,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

const partialShipmentStatuses = [
	"available_now",
	"held_until_complete",
	"awaiting_inbound",
	"backordered",
	"ready_to_ship_remaining",
] as const;
const deliveryModes = ["pickup", "delivery", "ship"] as const;

export const inventoryPartialShipmentFilterParamsSchema = {
	q: parseAsString,
	statuses: parseAsArrayOf(parseAsStringLiteral(partialShipmentStatuses)),
	deliveryModes: parseAsArrayOf(parseAsStringLiteral(deliveryModes)),
	holdUntilComplete: parseAsBoolean,
};

export function useInventoryPartialShipmentFilterParams() {
	const [filters, setFilters] = useQueryStates(
		inventoryPartialShipmentFilterParamsSchema,
		{ shallow: false },
	);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) =>
			Array.isArray(value) ? value.length > 0 : value !== null,
		),
	};
}

export const loadInventoryPartialShipmentFilterParams = createLoader(
	inventoryPartialShipmentFilterParamsSchema,
);
