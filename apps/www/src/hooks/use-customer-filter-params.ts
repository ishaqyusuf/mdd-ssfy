import type { Item } from "@/components/tables-2/inbound-management/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { inboundFilterStatus } from "@gnd/utils/constants";
import {
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryStates,
} from "nuqs";
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
export function useInboundView() {
	const [params, setParams] = useQueryStates({
		viewInboundId: parseAsInteger,
		payload: parseAsJson<Item | null>(null),
	});
	return {
		params,
		setParams,
	};
}
export const loadCustomerFilterParams = createLoader(
	customerFilterParamsSchema,
);
