import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

export function useCreateCustomerParams() {
    const onClose = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        customerForm: parseAsBoolean,
        // : parseAsString,
        // tab: parseAsStringEnum(["general", "sales", "quotes", "payments"]),
        // onCloseQuery: parseAsJson(),
        customerId: parseAsInteger,
        addressOnly: parseAsBoolean,
    });

    return {
        params,
        setParams,
    };
}
