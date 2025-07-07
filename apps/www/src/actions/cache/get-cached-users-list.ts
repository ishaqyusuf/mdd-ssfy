"use server";

import { unstable_cache } from "next/cache";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Tags } from "@/utils/constants";

import { getUsersListAction } from "../get-users-list";

export const getCachedUsersList = async (query: SearchParamsType) => {
    return unstable_cache(getUsersListAction, [Tags.users], {
        tags: [Tags.users],
    })(query);
};
