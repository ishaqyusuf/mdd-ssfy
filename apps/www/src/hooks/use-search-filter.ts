"use client";

import { timeout } from "@/lib/timeout";
import createContextFactory from "@/utils/context-factory";
import { isArrayParser } from "@/utils/nuq-is-array";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

interface Props {
    filterSchema?: Partial<Record<string, any>>;
}
export const {
    Provider: SearchFilterProvider,
    useContext: useSearchFilterContext,
} = createContextFactory(({ filterSchema }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [filters, setFilters] = useQueryStates(filterSchema, {
        // shallow: false,
    });
    const [hasFilter, setHasFilter] = useState(false);
    useEffect(() => {
        timeout(1000).then((e) => {
            setHasFilter(
                Object.entries(filters).some(
                    ([a, b]) => ["q"].every((c) => c !== a) && b,
                ),
            );
        });
    }, []);
    const shouldFetch = isOpen || isFocused || hasFilter;
    function normalizeFilterValue(parser, value) {
        if (value === null || value === undefined) return value;
        if (!parser?.parse) return value;

        try {
            return parser.parse(String(value));
        } catch {
            return value;
        }
    }

    function optionSelected(qk, { label, value }) {
        const parser = filterSchema?.[qk];
        const isArray = isArrayParser(parser);
        const normalizedValue = normalizeFilterValue(parser, value);

        setFilters({
            [qk]: !isArray
                ? normalizedValue
                : filters?.[qk]?.includes(normalizedValue)
                  ? filters?.[qk].filter((s) => s !== normalizedValue)
                  : [...(filters?.[qk] ?? []), normalizedValue],
        });
    }
    return {
        shouldFetch,
        optionSelected,
        isFocused,
        setIsFocused,
        isOpen,
        setIsOpen,
        filters,
        setFilters,
    };
});
