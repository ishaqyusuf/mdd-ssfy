"use server";

import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma } from "@/db";

export async function getCustomerProfileList() {
    // const resp = await _cache(
    //     "customer-profiles",
    //     async () => {
    const ls = await prisma.customerTypes.findMany({});
    // console.log(ls);
    return ls.map(({ id: value, title: label }) => ({
        label,
        value,
    }));
    //     },
    //     "customer-profiles"
    // );
    // console.log(resp);
    // return resp;
}
