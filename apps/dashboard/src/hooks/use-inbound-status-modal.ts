import {
    useQueryStates,
    parseAsString,
    parseAsInteger,
    parseAsBoolean,
} from "nuqs";

export function useInboundStatusModal() {
    const [params, setParams] = useQueryStates({
        inboundOrderId: parseAsInteger,
        inboundOrderNo: parseAsString,
        inboundOrderStatus: parseAsString,
        updateInboundStatus: parseAsBoolean,
    });

    return {
        params,
        setParams,
        isOpened: !!params?.inboundOrderId,
    };
}
