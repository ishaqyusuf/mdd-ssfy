import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCommunityModelCostParams() {
    const [params, setParams] = useQueryStates({
        createModelCost: parseAsBoolean,
        editModelCostTemplateId: parseAsInteger,
        editModelCostId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

