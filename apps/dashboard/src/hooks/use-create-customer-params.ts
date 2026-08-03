import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";

import { z } from "zod";
import { useOnCloseQuery } from "./use-on-close-query";

export function useCreateCustomerParams() {
	const onClose = useOnCloseQuery();
	const [params, setParams] = useQueryStates({
		customerForm: parseAsBoolean,
		addressId: parseAsInteger,
		customerId: parseAsInteger,
		billingAddressId: parseAsInteger,
		shippingAddressId: parseAsInteger,
		salesType: parseAsStringEnum(["order", "quote"]),
		salesId: parseAsInteger,
		search: parseAsString,
		address: parseAsStringEnum(["sad", "bad"]),
		formSectionsTrigger: parseAsArrayOf(parseAsString).withDefault(["general"]),
		payload: parseAsJson(
			z.object({
				addressId: z.number().optional(),
				billingAddressId: z.number().optional(),
				customerId: z.number().optional(),
				shippingAddressId: z.number().optional(),
				address: z.enum(["sad", "bad"] as const).optional(),
			}).parse,
		),
	});
	const action = !params.address
		? !params.customerId
			? "Create"
			: "Edit"
		: !params.addressId
			? "Create"
			: "Edit";
	return {
		params,
		setParams,
		actionTitle: action == "Edit" ? "Update" : action,
		title: [
			action,
			!params.address
				? "Customer"
				: { sad: "Shipping Address", bad: "Billing Address" }[params.address],
		].join(" "),
	};
}
