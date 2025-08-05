import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCommunityModelCostParams() {
    const [params, setParams] = useQueryStates({
        createModelCost: parseAsBoolean,
    });

    return {
        ...params,
        setParams,
    };
}

