import type { RouterInputs } from "@api/trpc/routers/dealership-app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["dealerPortal"]["orders"], void>;
const dealerPaymentStates = ["due", "paid", "credit"] as const;

export const ordersFilterParamsSchema = {
	q: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	orderNo: parseAsString,
	status: parseAsString,
	deliveryOption: parseAsString,
	customerProfileId: parseAsString,
	amountDue: parseAsStringLiteral(dealerPaymentStates),
	invoiceStatus: parseAsString,
	paymentStatus: parseAsStringLiteral(dealerPaymentStates),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useOrdersFilterParams() {
	const [filters, setFilters] = useQueryStates(ordersFilterParamsSchema);

	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
		isPending: false,
	};
}

export const loadOrdersFilterParams = createLoader(ordersFilterParamsSchema);
