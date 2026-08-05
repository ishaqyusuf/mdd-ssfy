import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsBoolean,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

const backorderStatuses = [
	"awaiting_inbound",
	"backordered",
	"ready_to_ship_remaining",
] as const;
const deliveryModes = ["pickup", "delivery", "ship"] as const;

export const inventoryBackorderFilterParamsSchema = {
	q: parseAsString,
	statuses: parseAsArrayOf(parseAsStringLiteral(backorderStatuses)),
	deliveryModes: parseAsArrayOf(parseAsStringLiteral(deliveryModes)),
	holdUntilComplete: parseAsBoolean,
};

export function useInventoryBackorderFilterParams() {
	const [filters, setFilters] = useQueryStates(
		inventoryBackorderFilterParamsSchema,
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

export const loadInventoryBackorderFilterParams = createLoader(
	inventoryBackorderFilterParamsSchema,
);
