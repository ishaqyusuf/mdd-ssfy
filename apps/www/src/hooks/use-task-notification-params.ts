import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

export function useTaskNotificationParams() {
    const [filters, setFilters] = useQueryStates({
        tasks: parseAsArrayOf(parseAsString, ","),
    });

    return {
        filters,
        setFilters,
        pushTask(runUid, accessUid, title?, description?) {
            setFilters({
                tasks: [
                    ...(filters.tasks || []),
                    [runUid, accessUid, title, description]
                        .map((a) => (a ? a : ""))
                        .join(";"),
                ],
            });
        },
    };
}

