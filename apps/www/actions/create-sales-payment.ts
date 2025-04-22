"use server";

import { SquarePaymentStatus } from "@/_v2/lib/square";
import {
    SalesPaymentStatus,
    SquarePaymentMethods,
} from "@/app/(clean-code)/(sales)/types";
import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { errorHandler } from "@/modules/error/handler";
import { createSquareTerminalCheckout } from "@/modules/square";
import { z } from "zod";

import { getCustomerPendingSales } from "./get-customer-pending-sales";
import { getCustomerWalletAction } from "./get-customer-wallet";
import { actionClient } from "./safe-action";
import { createPaymentSchema } from "./schema";
import { updateSalesDueAmount } from "./update-sales-due-amount";

export const createSalesPaymentAction = actionClient
    .schema(createPaymentSchema)
    .metadata({
        name: "create-sales-payment",
    })
    .action(async ({ parsedInput: { ...input } }) => {
        let response = {
            terminalPaymentSession: null as typeof input.terminalPaymentSession,
            status: null,
        };
        if (input.paymentMethod == "terminal") {
            if (input.terminalPaymentSession?.squarePaymentId) {
                await applySalesPayment(input);
                response.status = "success";
            } else {
                const { error, resp: data } =
                    await createTerminalPayment(input);
                if (error) throw Error(error.message);
                response.terminalPaymentSession = {
                    squarePaymentId: data.squarePaymentId,
                    squareCheckoutId: data.squareCheckout.id,
                    status: data.status,
                    // tip: data.tip
                };
            }
        } else {
            await applySalesPayment(input);
            response.status = "success";
        }
        return response;
    });

async function applySalesPayment(props: z.infer<typeof createPaymentSchema>) {
    return prisma.$transaction((async (tx: typeof prisma) => {
        const wallet = await getCustomerWalletAction(props.accountNo);
        if (!wallet) throw new Error("Customer not found.");
        const pendingSalesData = await getCustomerPendingSales(props.accountNo);
        let balance = +props.amount;
        await Promise.all(
            props.salesIds.map(async (orderId) => {
                const order = pendingSalesData.find((o) => o.id == orderId);
                if (!order) throw new Error("Order not found.");
                let payAmount =
                    balance > order.amountDue ? order.amountDue : balance;
                balance -= payAmount;
                const __tx = await prisma.customerTransaction.create({
                    data: {
                        amount: payAmount,
                        wallet: {
                            connect: {
                                id: wallet.id,
                            },
                        },
                        paymentMethod: props.paymentMethod,
                        status: "success" as any as SquarePaymentStatus,
                        meta: {
                            checkNo: props.checkNo,
                        },

                        author: {
                            connect: {
                                id: await authId(),
                            },
                        },
                        squarePayment: props.terminalPaymentSession
                            ?.squarePaymentId
                            ? {
                                  connect: {
                                      id: props.terminalPaymentSession
                                          ?.squarePaymentId,
                                  },
                              }
                            : undefined,
                        salesPayments: {
                            create: {
                                meta: {
                                    checkNo: props.checkNo,
                                },
                                amount: payAmount,
                                status: "success" as SalesPaymentStatus,
                                orderId: order.id,
                                squarePaymentsId:
                                    props.terminalPaymentSession
                                        ?.squarePaymentId,
                            },
                        },
                    },
                });
                await updateSalesDueAmount(orderId);
            }),
        );
        return {};
    }) as any);
}

async function createTerminalPayment(
    props: z.infer<typeof createPaymentSchema>,
) {
    return await errorHandler(async () => {
        const checkout = await createSquareTerminalCheckout({
            deviceId: props.deviceId,
            allowTipping: props.enableTip,
            amount: props.amount,
            orderIds: props?.orderNos,
        });

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
                paymentTerminal: {
                    connectOrCreate: {
                        where: {
                            terminalId: props.deviceId,
                        },
                        create: {
                            terminalId: props.deviceId,
                            terminalName: props.deviceName,
                        },
                    },
                },
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
