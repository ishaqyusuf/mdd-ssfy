import { parseAsArrayOf, parseAsInteger, useQueryStates } from "nuqs";

export function useSalesEmailSender() {
    const [params, setParams] = useQueryStates({
        orderIds: parseAsArrayOf(parseAsInteger),
    });

    return {
        params,
        setParams,
    };
}

