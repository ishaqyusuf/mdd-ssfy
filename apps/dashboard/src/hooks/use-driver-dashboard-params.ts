import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const driverDashboardViews = [
	"today",
	"all",
	"exceptions",
	"completed",
] as const;

export const driverStopModes = ["details", "packing", "proof", "help"] as const;
export const driverStopTabs = ["overview", "items", "activity"] as const;

// Stop subflows are client-owned overlays. Keep the stop workspace mounted while
// their URL state changes so only the subflow can show a loading boundary.
export const DRIVER_STOP_URL_OPTIONS = { shallow: true } as const;

export const driverDashboardParamsSchema = {
	view: parseAsStringLiteral(driverDashboardViews).withDefault("today"),
	q: parseAsString,
	mode: parseAsStringLiteral(driverStopModes).withDefault("details"),
	tab: parseAsStringLiteral(driverStopTabs).withDefault("overview"),
};

export const driverDashboardSearchParamsSchema = {
	q: driverDashboardParamsSchema.q,
};

export function useDriverDashboardParams() {
	const [params, setParams] = useQueryStates(driverDashboardParamsSchema, {
		shallow: false,
	});

	return { params, setParams };
}

export const loadDriverDashboardParams = createLoader(
	driverDashboardParamsSchema,
);
