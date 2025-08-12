import { createLoader, parseAsInteger, useQueryStates } from "nuqs";

const inventoryParamsSchema = {
    productId: parseAsInteger,
};

export function useInventoryParams() {
    const [params, setParams] = useQueryStates(inventoryParamsSchema);

    return {
        ...params,
        setParams,
    };
}

export const loadInventoryParams = createLoader(inventoryParamsSchema);

