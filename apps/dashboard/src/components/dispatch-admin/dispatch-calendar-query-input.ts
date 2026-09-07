import type { RouterInputs } from "@api/trpc/routers/_app";

type DispatchCalendarInput = Exclude<RouterInputs["dispatch"]["calendar"], void>;
type DispatchCalendarFilters = Pick<
	DispatchCalendarInput,
	"deliveryModes" | "driversId" | "dueBuckets" | "q" | "risks" | "stages"
>;

export function createDispatchCalendarQueryInput(
	filters: DispatchCalendarFilters,
	range: { from: string; to: string } | undefined,
	unscheduled = false,
): DispatchCalendarInput {
	const filtersInput = {
		section: "calendar",
		q: filters.q,
		stages: filters.stages,
		driversId: filters.driversId,
		dueBuckets: filters.dueBuckets,
		deliveryModes: filters.deliveryModes,
		risks: filters.risks,
		size: 100,
	} as const;
	if (unscheduled) return { ...filtersInput, unscheduled: true };
	if (!range) throw new Error("Scheduled calendar queries require a date range");
	return { ...filtersInput, ...range, unscheduled: false };
}
