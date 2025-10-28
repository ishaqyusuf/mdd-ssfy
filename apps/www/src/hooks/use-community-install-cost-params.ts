import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCommunityInstallCostParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        editCommunityModelInstallCostId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

