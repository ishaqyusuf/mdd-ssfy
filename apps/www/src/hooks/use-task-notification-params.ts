import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

export function useTaskNotificationParams() {
    const [filters, setFilters] = useQueryStates({
        tasks: parseAsArrayOf(parseAsString, ","),
    });

    return {
        filters,
        setFilters,
    };
}

