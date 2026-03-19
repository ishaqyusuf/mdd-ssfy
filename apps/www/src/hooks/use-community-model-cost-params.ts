import { parseAsBoolean, parseAsInteger, parseAsJson, useQueryStates } from "nuqs";

export function useCommunityModelCostParams() {
    const [params, setParams] = useQueryStates({
        createModelCost: parseAsBoolean,
        editModelCostTemplateId: parseAsInteger,
        editModelCostId: parseAsInteger,
        returnToInstallCost: parseAsJson<any>(null as any),
    });

    return {
        ...params,
        setParams,
    };
}
