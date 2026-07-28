import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCustomerServiceParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        openCustomerServiceId: parseAsInteger,
        // editModelCostId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

