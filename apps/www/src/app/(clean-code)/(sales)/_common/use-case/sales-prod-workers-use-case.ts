"use server";

import { SelectOption } from "@/app/(clean-code)/type";
import { getSalesProdWorkersdta } from "../data-access/production-workers-dta";
import { unstable_cache } from "next/cache";

export async function getSalesProdWorkersAsSelectOption(): Promise<
    SelectOption[]
> {
    // return unstable_cache(
    // async () => {
    const w = await getSalesProdWorkersdta();
    return w?.map((s) => ({
        data: s,
        label: s.name,
        value: s.id,
    }));
    // },
    //     ["sales-prod-workers", "employees"],
    //     {
    //         tags: [],
    //         revalidate: 1800,
    //     }
    // );
}
