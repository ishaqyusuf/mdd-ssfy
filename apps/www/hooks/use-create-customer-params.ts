import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";
import { z } from "zod";

export function useCreateCustomerParams() {
    const onClose = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        customerForm: parseAsBoolean,
        addressId: parseAsInteger,
        customerId: parseAsInteger,
        search: parseAsString,
        address: parseAsStringEnum(["sad", "bad"]),
        payload: parseAsJson(
            z.object({
                addressId: z.number().optional(),
                customerId: z.number().optional(),
                address: z.enum(["sad", "bad"] as const),
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
                : { sad: "Shipping Address", bad: "Billing Address" }[
                      params.address
                  ],
        ].join(" "),
    };
}
