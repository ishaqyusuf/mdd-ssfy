import { createLoader, parseAsInteger, useQueryStates } from "nuqs";

export function useInventoryCategoryParams() {
    const [params, setParams] = useQueryStates({
        categoryId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

