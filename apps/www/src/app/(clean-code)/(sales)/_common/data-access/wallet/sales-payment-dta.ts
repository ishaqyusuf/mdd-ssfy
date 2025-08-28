import { whereNotTrashed } from "@/app/(clean-code)/_common/utils/db-utils";
import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import {
    cancelSquareTerminalPayment,
    fetchDevicesByLocations,
    getSquareDevices,
    getTerminalPaymentStatus,
} from "@/modules/square";

import {
    SalesPaymentStatus,
    SalesPaymentType,
    SalesType,
} from "../../../types";

export async function getSalesPaymentDta(id) {
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: {
            type: "order" as SalesType,
            id,
        },
        select: {
            paymentDueDate: true,
            amountDue: true,
            payments: {
                ...whereNotTrashed,
                select: {
                    amount: true,
                    status: true,
                    createdAt: true,
                    id: true,
                    checkout: {
                        select: {
                            id: true,
                        },
                    },
                    commissions: {
                        select: {
                            amount: true,
                        },
                    },
                },
            },
        },
    });
    return {
        ...order,
        payments: order.payments.map((p) => {
            return {
                ...p,
                date: formatDate(p.createdAt),
            };
        }),
    };
}
export async function getPaymentTerminalsDta() {
    const devices = await getSquareDevices();

    if (!devices?.length) throw new Error("Unable to load payment devices");
    const lastPayment = await prisma.salesCheckout.findFirst({
        where: {
            terminalId: {
                in: devices?.map((d) => d.value),
            },
            userId: await userId(),
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    const locs = await fetchDevicesByLocations();
    return {
        devices,
        lastUsed: devices.find((d) => d.value == lastPayment?.terminalId),
        locs,
    };
}
export interface CreateSalesPaymentProps {
    amount;
    paymentType: SalesPaymentType;
    status?: SalesPaymentStatus;
    terminalId: string;
    email?: string;
    phone?: string;
    orderId;
}
export async function createSalesPaymentDta({
    amount,
    paymentType,
    status,
    terminalId,
    orderId,
    email,
    phone,
}: CreateSalesPaymentProps) {
    status = "created";
    const checkout = await prisma.salesCheckout.create({
        data: {
            amount: Number(amount),
            paymentType,
            status,
            userId: await userId(),
            terminalId,
            orderId,
            meta: { email, phone },
        },
    });
    return {
        id: checkout.id,
    };
}
export async function squareSalesPaymentCreatedDta(
    id,
    paymentId,
    squareOrderId,
) {
    const result = await prisma.salesCheckout.update({
        where: { id },
        data: {
            status: "pending" as SalesPaymentStatus,
            paymentId,
            meta: {
                squareOrderId,
            },
        },
    });
    return result;
}
async function updateSalesPaymentStatusDta(id, status: SalesPaymentStatus) {
    await prisma.salesCheckout.update({
        where: { id },
        data: {
            status,
        },
    });
}
async function updateSalesPaymentTipDta(id, tip) {
    await prisma.salesCheckout.update({
        where: { id },
        data: {
            tip,
        },
    });
}
export async function checkTerminalPaymentStatusDta(id) {
    const s = await prisma.salesCheckout.findUnique({
        where: { id },
        select: {
            status: true,
            id: true,
            terminalId: true,
            amount: true,
            orderId: true,
            paymentId: true,
            order: {
                select: {
                    customerId: true,
                    amountDue: true,
                },
            },
        },
    });
    const checkoutStatus: SalesPaymentStatus = s.status as any;
    const { status, tip } = await getTerminalPaymentStatus(s.paymentId);
    if (status != "PENDING") {
        switch (status) {
            case "COMPLETED":
                if (checkoutStatus != "success") {
                    if (tip) await updateSalesPaymentTipDta(id, tip);
                    await salesPaymentSuccessDta({
                        checkoutId: s.id,
                        amount: s.amount,
                        tip,
                        orderId: s.orderId,
                        customerId: s.order.customerId,
                        amountDue: s.order.amountDue,
                    });
                }
                return {
                    success: "payment received",
                };
                break;
            default:
                return {
                    error: status,
                };
        }
        return null;
    }
}
export async function salesPaymentSuccessDta({
    checkoutId,
    amount,
    tip,
    orderId,
    customerId,
    amountDue,
}) {
    await updateSalesPaymentStatusDta(checkoutId, "success");
    await prisma.salesOrders.update({
        where: { id: orderId },
        data: {
            amountDue: amountDue - amount,
        },
    });
    return await prisma.salesPayments.create({
        data: {
            orderId,
            // transaction: {
            //     create: {
            //         amount,
            //         authorId: await userId(),
            //         // walletId: null
            //     }
            // },
            amount,
            tip,
            meta: {},
            status: "success",
            // customerId,
        },
    });
}
export async function cancelSalesPaymentCheckoutDta(id) {
    const sc = await prisma.salesCheckout.update({
        where: { id },
        // include: {order:true}
        data: {
            status: "cancelled" as SalesPaymentStatus,
        },
    });
    await cancelSquareTerminalPayment(sc.paymentId);
}
