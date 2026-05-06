import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

type SalesOverviewQueryType = SalesType | "sales";

const openModes = [
	"quote",
	"sales",
	"sales-production",
	"dispatch-modal",
	"production-tasks",
] as const;

export function useSalesOverviewV2PageQuery() {
	const [params, setParams] = useQueryStates({
		overviewId: parseAsString,
		overviewType: parseAsStringEnum([
			"quote",
			"sales",
			"order",
		] as SalesOverviewQueryType[]),
		overviewMode: parseAsStringEnum([...openModes]),
		overviewTab: parseAsStringEnum([
			"general",
			"overview",
			"production",
			"transaction",
			"transactions",
			"inbound",
			"activity",
			"dispatch",
			"packing",
			"finance",
			"details",
		] as const),
		dispatchId: parseAsString,
	});

	return {
		params,
		setParams,
		close() {
			setParams(null);
		},
	};
}
