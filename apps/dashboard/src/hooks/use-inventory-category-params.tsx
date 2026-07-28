import { createLoader, parseAsInteger, useQueryStates } from "nuqs";

export function useInventoryCategoryParams() {
    const [params, setParams] = useQueryStates({
        editCategoryId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

