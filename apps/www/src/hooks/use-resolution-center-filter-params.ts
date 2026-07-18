import type { RouterInputs } from "@api/trpc/routers/_app";
import { parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";

type FilterKeys = keyof Exclude<
	RouterInputs["sales"]["getSalesResolutions"],
	void
>;

export const resolutionCenterFilterParamsSchema = {
	q: parseAsString,
	salesNo: parseAsString,
	"customer.name": parseAsString,
	status: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useResolutionCenterFilterParams() {
	const [filters, setFilters] = useQueryStates(
		resolutionCenterFilterParamsSchema,
	);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}
export const loadResolutionCenterFilterParams = createLoader(
	resolutionCenterFilterParamsSchema,
);
