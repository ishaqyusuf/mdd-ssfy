import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

export function useSalesFilterParams() {
    const [params, setParams] = useQueryStates({});

    return {
        params,
        setParams,
    };
}
