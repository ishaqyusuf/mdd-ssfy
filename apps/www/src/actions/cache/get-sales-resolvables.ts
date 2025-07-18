"use server";

import {
    SalesPaymentStatus,
    SalesType,
} from "@/app/(clean-code)/(sales)/types";
import { dateEquals } from "@/app/(v1)/_actions/action-utils";
import { prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { SalesResolutionConflictType } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export async function getSalesResolvables() {
    const tags = ["sales-resolvables"];
    const fn = async () => {
        const resolvedToday = await prisma.salesResolution.findMany({
            where: {
                createdAt: dateEquals(new Date()),
            },
            select: {
                id: true,
                salesId: true,
                createdAt: true,
            },
        });

        const list = await prisma.salesOrders.findMany({
            where: {
                type: "order" as SalesType,
                payments: {
                    some: {
                        deletedAt: null,
                        // status: {
                        //     in: ["success"] as SalesPaymentStatus[],
                        // },
                    },
                },
            },
            select: {
                id: true,
                grandTotal: true,
                createdAt: true,
                amountDue: true,
                orderId: true,
                customer: {
                    select: {
                        name: true,
                        businessName: true,
                        phoneNo: true,
                    },
                },
                salesRep: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                payments: {
                    where: {
                        deletedAt: null,
                        // status: {
                        //     in: ["success"] as SalesPaymentStatus[],
                        // },
                    },
                    select: {
                        amount: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });
        return list
            .map((ls) => {
                const { salesRep, orderId, customer } = ls;
                let payments = ls.payments.filter((a) => a.status == "success");
                const paid = formatMoney(sum(payments, "amount"));
                const date = ls.payments[0]?.createdAt;
                const total = ls.grandTotal;
                const due = formatMoney(ls.amountDue);
                const calculatedDue = formatMoney(sum([total, -1 * paid]));

                let status: SalesResolutionConflictType = "" as any;
                const hasDuplicate =
                    payments.length !==
                    new Set(payments.map((p) => p.amount)).size;

                if (due < 0) {
                    status = "overpayment";
                } else if (hasDuplicate) {
                    status = "duplicate payments";
                } else if (calculatedDue !== due) {
                    status = "payment not up to date";
                }
                const rData = resolvedToday?.find((a) => a.salesId == ls.id);
                if (rData) {
                    status = "resolved";
                }
                return {
                    id: ls.id,
                    customer,
                    paid,
                    date,
                    total,
                    due,
                    status,
                    calculatedDue,
                    paymentCount: payments.length,
                    salesRep: salesRep?.name,
                    orderDate: formatDate(ls.createdAt),
                    orderId,
                    accountNo: ls.customer?.phoneNo,
                    resolvedAt: rData?.createdAt,
                };
            })
            .filter(
                (a) =>
                    a.status || !!resolvedToday?.find((b) => b.salesId == a.id),
            )
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
    };

    return unstable_cache(fn, tags, {
        tags,
    })();
}
