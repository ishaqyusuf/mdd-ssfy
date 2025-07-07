"use server";

import { getSalesItemOverviewDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { getSalesItemsOverviewAction } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-items-action";
import { prisma } from "@/db";

export async function getTakeOffForm(id) {
    // const data = await getSalesItemsOverviewAction({
    //     salesId: id,
    //     adminMode: true,
    // });
    // const meta = data.meta;
    // const takeOff = meta.takeOff;
    // data.items.map((item) => {
    //     const itemControlUid = item.itemControlUid;
    //     const qty = item.status.qty;
    // });
    // let takeoff = await prisma.salesTakeOff.findFirst({
    //     where: {
    //         salesId: id,
    //     },
    //     include: {
    //         sections: {
    //             include: {
    //                 components: true,
    //             },
    //         },
    //     },
    // });
    // if (!takeoff)
    //     takeoff = await prisma.salesTakeOff.create({
    //         data: {
    //             salesId: id,
    //         },
    //         include: {
    //             sections: {
    //                 include: {
    //                     components: true,
    //                 },
    //             },
    //         },
    //     });
    // return {
    //     takeOff,
    //     items: data.items,
    //     data,
    //     id,
    // };
    return null as any;
}
