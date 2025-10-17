import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useSalesAccountingParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openSalesAccountingId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openSalesAccountingId;
    return {
        ...params,
        setParams,
        opened,
    };
}

