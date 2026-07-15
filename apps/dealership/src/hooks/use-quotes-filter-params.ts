import type { RouterInputs } from "@api/trpc/routers/dealership-app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["dealerPortal"]["quotes"], void>;
const dealerPaymentStates = ["due", "paid", "credit"] as const;

export const quotesFilterParamsSchema = {
	q: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	orderNo: parseAsString,
	status: parseAsString,
	deliveryOption: parseAsString,
	customerProfileId: parseAsString,
	amountDue: parseAsStringLiteral(dealerPaymentStates),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useQuotesFilterParams() {
	const [filters, setFilters] = useQueryStates(quotesFilterParamsSchema);

	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
		isPending: false,
	};
}

export const loadQuotesFilterParams = createLoader(quotesFilterParamsSchema);
