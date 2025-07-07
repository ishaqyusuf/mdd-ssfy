import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";

export function useInboundStatusModal() {
    const [params, setParams] = useQueryStates({
        inboundOrderId: parseAsInteger,
        inboundOrderNo: parseAsString,
    });

    return {
        params,
        setParams,
        isOpened: !!params?.inboundOrderId,
    };
}
