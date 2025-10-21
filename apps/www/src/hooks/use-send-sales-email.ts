import { parseAsInteger, parseAsArrayOf, useQueryStates } from "nuqs";

export function useSendSalesEmail() {
    const [params, setParams] = useQueryStates({
        sendEmailSalesId: parseAsArrayOf(parseAsInteger),
    });

    return {
        params,
        setParams,
    };
}

