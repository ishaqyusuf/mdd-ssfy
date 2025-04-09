import { parseAsInteger, useQueryStates } from "nuqs";

export function useTransactionOverviewModal() {
    const [params, setParams] = useQueryStates({
        transactionId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
        viewTx(transactionId) {
            setParams({
                transactionId,
            });
        },
    };
}
