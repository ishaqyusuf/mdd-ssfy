import type { RouterInputs } from "@api/trpc/routers/_app";

type DispatchCalendarInput = RouterInputs["dispatch"]["calendar"];
type DispatchCalendarFilters = Pick<
	DispatchCalendarInput,
	"deliveryModes" | "driversId" | "dueBuckets" | "q" | "risks" | "stages"
>;

export function createDispatchCalendarQueryInput(
	filters: DispatchCalendarFilters,
): DispatchCalendarInput {
	return {
		section: "calendar",
		q: filters.q,
		stages: filters.stages,
		driversId: filters.driversId,
		dueBuckets: filters.dueBuckets,
		deliveryModes: filters.deliveryModes,
		risks: filters.risks,
		size: 500,
	};
}
