import { parseAsInteger, useQueryStates } from "nuqs";

export function useSalesQuickPay() {
    const [params, setParams] = useQueryStates({
        quickPaySalesId: parseAsInteger,
    });

    return {
        params,
        setParams,
    };
}

