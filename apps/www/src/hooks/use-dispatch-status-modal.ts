import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";

export function useDispatchstatusModal() {
    const [params, setParams] = useQueryStates({
        dispatchSaleId: parseAsInteger,
        status: parseAsString,
    });

    return {
        params,
        setParams,
        isOpened: !!params?.dispatchSaleId && !!params?.status,
    };
}
