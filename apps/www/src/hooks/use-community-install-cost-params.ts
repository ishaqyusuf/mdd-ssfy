import {
    parseAsBoolean,
    parseAsInteger,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

export function useCommunityInstallCostParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        editCommunityModelInstallCostId: parseAsInteger,
        view: parseAsStringEnum(["template-edit", "template-list"]).withDefault(
            "template-list",
        ),
    });
    const openToSide = params.view === "template-edit";
    return {
        ...params,
        openToSide,
        setParams,
    };
}

