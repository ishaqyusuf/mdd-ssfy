"use client";

import { parseAsBoolean, useQueryStates } from "nuqs";

export function useSalesFormFeatureParams() {
    const [params, setParams] = useQueryStates({
        legacyMode: parseAsBoolean,
    });
    return {
        params,
        setParams,
    };
}
