import {
    SearchParamsKeys,
    searchParamsParser,
} from "@/components/(clean-code)/data-table/search-params";
import { createSearchParamsCache } from "nuqs/server";

const { roleId, employeeProfileId, search } = searchParamsParser;
export const employeePageQuery = {
    search,
    roleId,
    employeeProfileId,
} as { [k in SearchParamsKeys]: any };
export const searchParamsCache = createSearchParamsCache(employeePageQuery);
