"use server";

import { SquarePaymentStatus } from "@/_v2/lib/square";
import { prisma } from "@/db";
import { updateSalesCheckoutStatus } from "./update-sales-checkout-status";

interface Props {
    paymentId: string;
}

export async function salesPaymentCheckoutResponse(props: Props) {
    const payment = await prisma.customerTransaction.findFirst({
        where: {
            squarePayment: {
                paymentId: props.paymentId,
            },
        },
        include: {
            squarePayment: {
                include: {
                    checkout: true,
                    orders: {
                        include: {
                            order: {
                                select: {
                                    amountDue: true,
                                    id: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    // return payment;
    const paymentStatus = payment.status as SquarePaymentStatus;
    // return { paymentStatus };
    if (paymentStatus == "PENDING") {
        return await updateSalesCheckoutStatus({
            squareOrderId: payment.squarePayment.squareOrderId,
            checkoutId: payment.squarePayment.checkout.id,
        });
    }
}
