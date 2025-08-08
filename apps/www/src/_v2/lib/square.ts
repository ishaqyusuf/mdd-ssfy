"use server";

import { prisma } from "@/db";
import { env } from "@/env.mjs";
import { __isProd } from "@/lib/is-prod-server";
import { squareClient } from "@/utils/square-utils";
import { OrderLineItem, PrePopulatedData } from "square";

export interface SquarePaymentMeta {
    squareOrderId;
}
export interface BaseSalesPaymentProps {
    customerName: string;
    amount?: number;
    dueAmount: number;
    grandTotal: number;
    description?: string;
    allowTip?: boolean;
    tip?: number;
    phone?: string;
    deviceId?: string;
    email?: string;
    items?: OrderLineItem[];
    address?: PrePopulatedData["buyerAddress"];
    orderId: number;
    orderIdStr: string;
    // type: "link" | "terminal";
    salesCheckoutId?: string;
    paymentId?: string;
    squareCustomerId?: string;
    terminalStatus?:
        | "idle"
        | "processing"
        | "processed"
        | "failed"
        | "cancelled";
}
export interface CreateSalesPaymentLinkProps extends BaseSalesPaymentProps {
    type: "link";
    deviceId?: never; // deviceId should not exist for type 'link'
}

export interface CreateSalesPaymentTerminalProps extends BaseSalesPaymentProps {
    type: "terminal";
    deviceId: string; // deviceId is required for type 'terminal'
}
export type SquarePaymentStatus =
    | "APPROVED"
    | "PENDING"
    | "COMPLETED"
    | "CANCELED"
    | "FAILED";
export type CreateSalesPaymentProps =
    | CreateSalesPaymentLinkProps
    | CreateSalesPaymentTerminalProps;

// const refreshAccessToken = async (refreshToken) => {
//     try {
//         const { result } = await client.oAuthApi.obtainToken({
//             clientId: process.env.SQUARE_CLIENT_ID,
//             clientSecret: process.env.SQUARE_CLIENT_SECRET,
//             refreshToken,
//             grantType: "authorization_code",
//             code: "",
//         });

//         return result.accessToken;
//     } catch (error) {
//         console.error("Error refreshing token:", error);
//     }
// };

export async function getSquareDevices() {
    try {
        const devices = await squareClient.devicesApi.listDeviceCodes();
        return devices?.result?.deviceCodes
            ?.map((device) => ({
                label: device?.name,
                status: device.status as "PAIRED" | "OFFLINE",
                value: device.deviceId,
                device,
            }))
            .sort((a, b) => a?.label?.localeCompare(b.label) as any);
    } catch (error) {}
}

export async function validateSquarePayment(id) {
    // const resp = await prisma.$transaction((async (tx) => {
    const tx = prisma;
    const checkout = await tx.salesCheckout.findUnique({
        where: {
            id,
        },
        include: {
            order: true,
            tenders: true,
        },
    });
    const meta: SquarePaymentMeta = checkout.meta as any;
    const {
        result: {
            order: { id: orderId, tenders },
        },
    } = await squareClient.ordersApi.retrieveOrder(meta.squareOrderId);

    const resp: { amount; tip; status: SquarePaymentStatus } = {
        amount: null,
        tip: null,
        status: null,
    };

    await Promise.all(
        tenders.map(async (tender) => {
            const {
                result: { payment },
            } = await squareClient.paymentsApi.getPayment(tender.paymentId);
            const tip = payment.tipMoney?.amount;
            resp.status = payment.status as any;
            if (resp.status == "COMPLETED") {
                resp.amount = Number(payment.amountMoney.amount) / 100;
                let t = Number(tip);
                resp.tip = t > 0 ? t / 100 : 0;
            }
            await tx.checkoutTenders.create({
                data: {
                    salesCheckoutId: checkout.id,
                    // squareOrderId: orderId,

                    status: resp.status,
                    tenderId: tender.id,
                    // squarePaymentId: payment.id,
                },
            });
        }),
    );
    if (resp.amount > 0) await paymentSuccess({ ...checkout, tip: resp.tip });
    return resp;
}
export async function paymentSuccess(p: {
    amount;
    orderId;
    tip;
    order: { customerId; amountDue };
    id;
}) {
    const _p = await prisma.salesPayments.create({
        data: {
            // transactionId: 1,
            amount: p.amount,
            orderId: p.orderId,
            tip: p.tip,
            meta: {},
            status: "success",
            // customerId: p.order.customerId,
        },
    });
    await prisma.salesCheckout.update({
        where: {
            id: p.id,
        },
        data: {
            tip: p.tip,
            status: "success" as any,
            salesPaymentsId: _p.id,
        },
    });
    let amountDue = p.order.amountDue - p.amount;
    await prisma.salesOrders.update({
        where: {
            id: p.orderId,
        },
        data: {
            amountDue,
        },
    });
}
export async function squarePaymentSuccessful(id) {
    const p = await prisma.salesCheckout.findUnique({
        where: {
            id,
        },
        include: {
            order: true,
        },
    });
    if (p.status == "success") return;
    await paymentSuccess(p);
}
export async function __cancelTerminalPayment(checkoutId) {
    // const p = await prisma.salesCheckout.findUnique({
    //     where: {
    //         id,
    //     },
    //     include: {
    //         order: true,
    //     },
    // });
    await squareClient.terminalApi.cancelTerminalCheckout(checkoutId);
}
export async function cancelTerminalPayment(id) {
    const p = await prisma.salesCheckout.findUnique({
        where: {
            id,
        },
        include: {
            order: true,
        },
    });
    await squareClient.terminalApi.cancelTerminalCheckout(p.paymentId);
    await prisma.salesCheckout.update({
        where: { id },
        data: {
            status: "cancelled",
        },
    });
}
