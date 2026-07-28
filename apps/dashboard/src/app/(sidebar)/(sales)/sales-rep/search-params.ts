import {
    createSearchParamsCache,
    parseAsString,
    parseAsStringEnum,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
    tab: parseAsStringEnum([
        "requests",
        "recent-sales",
        "recent-quotes",
        "commission",
    ]).withDefault("recent-sales"),
    start: parseAsString,
    end: parseAsString,
});
