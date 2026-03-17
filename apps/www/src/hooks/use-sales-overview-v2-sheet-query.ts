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
		"sales-overview-v2-sheet-id": parseAsString,
		"sales-overview-v2-sheet-type": parseAsStringEnum([
			"quote",
			"sales",
		] as SalesType[]),
		"sales-overview-v2-sheet-mode": parseAsStringEnum([...openModes]),
		"sales-overview-v2-sheet-tab": parseAsStringEnum([
			"general",
			"production",
			"transactions",
			"dispatch",
			"packing",
			"notes",
		] as const),
	});

	return {
		params,
		setParams,
		close() {
			setParams(null);
		},
	};
}
