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
		"sales-overview-v2-id": parseAsString,
		"sales-overview-v2-type": parseAsStringEnum([
			"quote",
			"sales",
		] as SalesType[]),
		"sales-overview-v2-mode": parseAsStringEnum([...openModes]),
		"sales-overview-v2-tab": parseAsStringEnum([
			"overview",
			"finance",
			"operations",
			"details",
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
