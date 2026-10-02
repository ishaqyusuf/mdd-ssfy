import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
export const inventoryInboundFilterParams = {
	inboundSearch: parseAsString,
	inboundStatus: parseAsStringLiteral([
		"pending",
		"in_progress",
		"completed",
		"issue_open",
		"closed",
		"cancelled",
	] as const),
};
export function useInventoryInboundFilterParams() {
	const [filters, setFilters] = useQueryStates(inventoryInboundFilterParams);
	return { filters, setFilters };
}
export const loadInventoryInboundFilterParams = createLoader(
	inventoryInboundFilterParams,
);
