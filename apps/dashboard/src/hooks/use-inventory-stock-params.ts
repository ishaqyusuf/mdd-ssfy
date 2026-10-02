import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
export function useInventoryStockParams() {
	const [params, setParams] = useQueryStates({
		stockOperation: parseAsStringLiteral(["adjust"] as const),
		stockInventoryId: parseAsInteger,
		stockVariantId: parseAsInteger,
		stockLocationId: parseAsInteger,
		stockAuditSearch: parseAsString.withDefault(""),
	});
	return { ...params, setParams };
}
