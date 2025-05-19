import { createSearchParamsCache, parseAsString } from "nuqs/parsers";

export const searchParamsCache = createSearchParamsCache({
    start: parseAsString,
    end: parseAsString,
});
