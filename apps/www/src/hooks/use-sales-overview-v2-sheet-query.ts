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

export function useSalesOverviewV2SheetQuery() {
	const [params, setParams] = useQueryStates({
		overviewSheetId: parseAsString,
		overviewSheetType: parseAsStringEnum([
			"quote",
			"sales",
			"order",
		] as SalesOverviewQueryType[]),
		overviewSheetMode: parseAsStringEnum([...openModes]),
		overviewSheetTab: parseAsStringEnum([
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
		overviewSheetDispatchId: parseAsString,
	});

	return {
		params,
		setParams,
		close() {
			setParams(null);
		},
	};
}
