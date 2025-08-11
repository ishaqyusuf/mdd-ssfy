import { createLoader, parseAsInteger, useQueryStates } from "nuqs";

const inventoryProductParamsSchema = {
    productId: parseAsInteger,
};

export function useInventoryProductParams() {
    const [params, setParams] = useQueryStates(inventoryProductParamsSchema);

    return {
        ...params,
        setParams,
    };
}

export const loadInventoryProductParams = createLoader(
    inventoryProductParamsSchema,
);

