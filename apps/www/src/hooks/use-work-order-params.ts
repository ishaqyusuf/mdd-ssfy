import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useWorkOrderParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        editWorkOrderId: parseAsInteger,
        // editModelCostId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

