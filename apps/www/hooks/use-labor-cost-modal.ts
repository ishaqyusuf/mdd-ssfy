import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useLaborCostModal() {
    const [params, setParams] = useQueryStates({
        laborCostModal: parseAsBoolean,
    });

    return {
        params,
        setParams,
    };
}
