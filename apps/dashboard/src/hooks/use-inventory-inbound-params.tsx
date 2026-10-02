import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

const inventoryInboundParamsSchema = {
    editInboundId: parseAsInteger,
    inboundId: parseAsInteger,
    createWarehouseInbound: parseAsBoolean,
    inboundQueue: parseAsBoolean,
};

export function useInventoryInboundParams() {
    const [params, setParams] = useQueryStates(inventoryInboundParamsSchema);

    return {
        ...params,
        setParams,
    };
}
