"use server";

import { prisma } from "@/db";
import { errorHandler } from "@/modules/error/handler";
import {
    createSquareTerminalCheckout,
    CreateTerminalCheckoutProps,
    getTerminalPaymentStatus,
} from "@/modules/square";
import { SquarePaymentMethods } from "../../../types";
import { authId } from "@/app/(v1)/_actions/utils";
import { __cancelTerminalPayment, SquarePaymentStatus } from "@/_v2/lib/square";
import { AsyncFnType } from "@/types";

interface Props extends CreateTerminalCheckoutProps {}
export type CreateTerminalPaymentAction = AsyncFnType<
    typeof createTerminalPaymentAction
>;
export async function createTerminalPaymentAction(props: Props) {
    return await errorHandler(async () => {
        const checkout = await createSquareTerminalCheckout(props);

        const squarePayment = await prisma.squarePayments.create({
            data: {
                paymentId: checkout.id,
                squareOrderId: checkout.squareOrderId,
                amount: props.amount,
                paymentMethod: "terminal" as SquarePaymentMethods,
                createdBy: {
                    connect: {
                        id: await authId(),
                    },
                },
                status: "PENDING" as SquarePaymentStatus,
                paymentTerminal: props.deviceName
                    ? {
                          connectOrCreate: {
                              where: {
                                  terminalId: props.deviceId,
                              },
                              create: {
                                  terminalId: props.deviceId,
                                  terminalName: props.deviceName,
                              },
                          },
                      }
                    : undefined,
            },
        });
        return {
            squarePaymentId: squarePayment.id,
            squareCheckout: checkout,
            status: squarePayment.status as SquarePaymentStatus,
            tip: null,
        };
    });
}
interface CheckTerminalPaymentStatusActionProps {
    checkoutId;
}
export async function checkTerminalPaymentStatusAction(
    props: CheckTerminalPaymentStatusActionProps,
) {
    const { status, tip } = await getTerminalPaymentStatus(props.checkoutId);
    return { status, tip };
}
export async function cancelTerminalCheckoutAction(
    checkoutId,
    squarePaymentId,
) {
    return await errorHandler(async () => {
        if (checkoutId) {
            const { status, tip } = await getTerminalPaymentStatus(checkoutId);

            if (status == "COMPLETED")
                throw new Error("Payment already received!");
            await __cancelTerminalPayment(checkoutId);
            // await prisma.squarePayments.update({
            //     where: {
            //         id: checkoutId,
            //     },
            //     data: {
            //         status: "CANCELED" as SquarePaymentStatus,
            //     },
            // });
        }
        if (squarePaymentId) {
            const r = await prisma.squarePayments.update({
                where: {
                    id: squarePaymentId,
                    status: {
                        not: "COMPLETED" as SquarePaymentStatus,
                    },
                },
                data: {
                    status: "CANCELED" as SquarePaymentStatus,
                },
            });
        }
    });
}
export async function paymentReceivedAction(squarePaymentId, checkoutId) {
    return await errorHandler(async () => {
        const r = await checkTerminalPaymentStatusAction({ checkoutId });
        if (r.status != "COMPLETED")
            throw new Error("Payment not completed from terminal.");

        const payment = await prisma.squarePayments.update({
            where: {
                id: squarePaymentId,
                status: {
                    not: "COMPLETED" as SquarePaymentStatus,
                },
            },
            data: {
                status: "COMPLETED" as SquarePaymentStatus,
                tip: r.tip,
            },
        });
        return payment.id;
    });
}
