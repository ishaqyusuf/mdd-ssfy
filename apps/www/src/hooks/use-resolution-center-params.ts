import {
    parseAsArrayOf,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

export function useResolutionCenterParams() {
    const onClose = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        resolutionIds: parseAsArrayOf(parseAsInteger),
        refreshToken: parseAsString,
    });
    return {
        params,
        setParams,
    };
}
