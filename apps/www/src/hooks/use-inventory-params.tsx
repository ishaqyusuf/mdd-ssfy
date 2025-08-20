import {
    createLoader,
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

const inventoryParamsSchema = {
    productId: parseAsInteger,
    editVariantUid: parseAsString,
    editVariantTab: parseAsStringEnum(["pricing", "stock", "overview"]),
};

export function useInventoryParams() {
    const [params, setParams] = useQueryStates(inventoryParamsSchema);

    return {
        ...params,
        setParams,
    };
}

export const loadInventoryParams = createLoader(inventoryParamsSchema);

