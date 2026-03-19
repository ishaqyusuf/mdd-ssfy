import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

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
		overviewType: parseAsStringEnum(["quote", "sales"] as SalesType[]),
		overviewMode: parseAsStringEnum([...openModes]),
		overviewTab: parseAsStringEnum([
			"overview",
			"finance",
			"production",
			"dispatch",
			"packing",
			"transactions",
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
