// import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { SalesType } from "@/app/(clean-code)/(sales)/types";

import { schedules } from "@trigger.dev/sdk/v3";

export const salesInvoiceScheduler = schedules.task({
    id: "sales-invoice-scheduler",
    // Every 08:00am
    cron: "0 8 * * *",
    run: async (payload, ctx) => {
        if (process.env.NODE_ENV !== "production") return;
        let val: SalesType = "order";
        // const pendingInvoices = await prisma.salesOrders.findMany({
        //     where: {
        //         type: "order" as SalesType,
        //         amountDue: {
        //             gt: 0,
        //         },
        //     },
        //     select: {
        //         id: true,
        //         customer: {
        //             select: {
        //                 phoneNo: true,
        //                 email: true,
        //             },
        //         },
        //         billingAddress: {
        //             select: {
        //                 phoneNo: true,
        //                 email: true,
        //             },
        //         },
        //     },
        // });
    },
});
