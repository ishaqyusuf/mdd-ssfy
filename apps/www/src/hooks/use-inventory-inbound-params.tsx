import { createLoader, parseAsInteger, useQueryStates } from "nuqs";

const inventoryInboundParamsSchema = {
    editInboundId: parseAsInteger,
};

export function useInventoryInboundParams() {
    const [params, setParams] = useQueryStates(inventoryInboundParamsSchema);

    return {
        ...params,
        setParams,
    };
}

export const loadInventoryInboundParams = createLoader(
    inventoryInboundParamsSchema,
);

