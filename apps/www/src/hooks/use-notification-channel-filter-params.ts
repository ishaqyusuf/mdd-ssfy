import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["notes"]["getNotificationChannels"],
    void
>;

export const notificationChannelFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useNotificationChannelFilterParams() {
    const [filters, setFilters] = useQueryStates(
        notificationChannelFilterParams,
    );
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadNotificationChannelFilterParams = createLoader(
    notificationChannelFilterParams,
);

