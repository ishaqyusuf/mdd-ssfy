"use server";

import { IconKeys } from "@/components/_v1/icons";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { AsyncFnType } from "@/types";
import { salesAddressLines } from "@/utils/sales-utils";

import { SalesMeta, SalesType } from "../../types";

export type LoadSalesOverviewAction = AsyncFnType<
    typeof loadSalesOverviewAction
>;
export async function loadSalesOverviewAction(id) {
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: { id },
        select: {
            createdAt: true,
            type: true,
            orderId: true,
            id: true,
            amountDue: true,
            grandTotal: true,
            isDyke: true,
            paymentDueDate: true,
            customer: {
                select: {
                    id: true,
                    phoneNo: true,
                    name: true,
                    businessName: true,
                },
            },
            shippingAddress: {
                select: {
                    id: true,
                    phoneNo: true,
                    name: true,
                    address1: true,
                },
            },
            billingAddress: {
                select: {
                    id: true,
                    phoneNo: true,
                    name: true,
                    address1: true,
                },
            },
            meta: true,
            salesRep: {
                select: {
                    name: true,
                    id: true,
                },
            },
        },
    });
    const displayName =
        order.customer?.businessName ||
        order.customer?.name ||
        order.billingAddress?.name;
    const meta: SalesMeta = order.meta || ({} as any);
    function addressLine(value, icon: IconKeys) {
        return { value, icon };
    }
    const phoneNo = order.customer?.phoneNo || order.billingAddress?.phoneNo;
    let type: SalesType = order.type as any;

    return {
        type,
        id: order.id,
        dyke: order.isDyke,
        due: order.amountDue,
        po: meta?.po,
        orderId: order.orderId,
        salesRep: order.salesRep,
        createdAt: order.createdAt,
        paymentDueDate: type == "order" ? order.paymentDueDate : null,

        invoice: {
            total: order.grandTotal,
            pending: order.amountDue,
            paid: formatMoney(order.grandTotal - order.amountDue),
            labour: meta?.labor_cost,
            delivery: meta?.deliveryCost,
        },
        title: [order.orderId, displayName].filter(Boolean).join(" | "),
        subtitle: "",
        phoneNo,
        customerId: order.customer?.id,
        displayName,
        shipping: salesAddressLines(
            order?.shippingAddress as any,
            order?.customer as any,
        ),
        billing: salesAddressLines(
            order?.billingAddress as any,
            order?.customer as any,
        ),

        // billing: [
        //     addressLine(order.billingAddress?.name || displayName, "user"),
        //     addressLine(order.billingAddress?.phoneNo || phoneNo, "phone"),
        //     addressLine(order.billingAddress?.address1, "address"),
        // ].filter((a) => a.value),
    };
}
