import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

export function useCreateCustomerParams() {
    const onClose = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        customerForm: parseAsBoolean,
        addressId: parseAsInteger,
        customerId: parseAsInteger,
        address: parseAsStringEnum(["sad", "bad"]),
        payload: parseAsJson<{
            addressId?: number;
            customerId?: number;
            address?: "sad" | "bad";
        }>(),
    });

    return {
        params,
        setParams,
        title: [
            !params.address
                ? !params.customerId
                    ? "Create"
                    : "Edit"
                : !params.addressId
                  ? "Create"
                  : "Edit",
            !params.address
                ? "Customer"
                : { sad: "Shipping Address", bad: "Billing Address" }[
                      params.address
                  ],
        ].join(" "),
    };
}
