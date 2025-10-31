"use server";

import { AsyncFnType } from "@/types";
import { getSaleDispatchListOverview } from "./dispatch-list-action";

export type DispatchOverviewAction = AsyncFnType<
    typeof salesDispatchListOverview
>;
export async function salesDispatchListOverview(id) {
    const listOverview = await getSaleDispatchListOverview(id);
    return {
        dispatches: listOverview,
    };
    // return listOverview.data;
}
