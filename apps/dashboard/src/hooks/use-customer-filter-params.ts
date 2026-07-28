import type { RouterInputs } from "@api/trpc/routers/_app";
import { inboundFilterStatus } from "@gnd/utils/constants";
import { parseAsString, useQueryStates } from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["inboundIndex"], void>;

export const customerFilterParamsSchema = {
	status: parseAsStringLiteral(inboundFilterStatus),
	q: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useCustomerFilterParams() {
	const [filter, setFilter] = useQueryStates(customerFilterParamsSchema);
	return {
		filter,
		setFilter,
		hasFilters: Object.values(filter).some((value) => value !== null),
	};
}
export const loadCustomerFilterParams = createLoader(
	customerFilterParamsSchema,
);
