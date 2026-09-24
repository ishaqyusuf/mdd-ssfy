import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCustomerServiceParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        openCustomerServiceId: parseAsInteger,
        openCustomerServiceOverviewId: parseAsInteger,
        // editModelCostId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}
