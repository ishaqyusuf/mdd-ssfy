import { createSearchParamsCache, parseAsString } from "nuqs/server";
export const tasksPageQuery = {
  search: parseAsString,
};
export const searchParamsCache = createSearchParamsCache({
  ...tasksPageQuery,
});
