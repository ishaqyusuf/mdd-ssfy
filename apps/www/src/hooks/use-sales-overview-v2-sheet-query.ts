import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

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
		overviewSheetType: parseAsStringEnum(["quote", "sales"] as SalesType[]),
		overviewSheetMode: parseAsStringEnum([...openModes]),
		overviewSheetTab: parseAsStringEnum([
			"overview",
			"finance",
			"production",
			"dispatch",
			"packing",
			"transactions",
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
