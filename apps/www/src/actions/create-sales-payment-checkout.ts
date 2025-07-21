"use server";

import { SquarePaymentStatus } from "@/_v2/lib/square";
import { PaymentMethods } from "@/app/(clean-code)/(sales)/types";
import { prisma as _prisma } from "@/db";
import { getBaseUrl } from "@/envs";
import { generateRandomString } from "@/lib/utils";
import { squareSalesNote } from "@/utils/sales-utils";
import { SQUARE_LOCATION_ID, squareClient } from "@/utils/square-utils";

import { CustomerTransactionType } from "./get-customer-tx-action";
import { getSalesPaymentCheckoutInfoAction } from "./get-sales-payment-checkout-info-action";

interface Props {
    emailToken: string;
    orderIds: string[];
    // primaryPhoneNo: string;
    orderIdsParam: string;
}
export async function createSalesCheckoutLinkAction(props: Props) {
    return await _prisma.$transaction((async (prisma: typeof _prisma) => {
        const { orderIds, emailToken, orderIdsParam } = props;
        const data = await getSalesPaymentCheckoutInfoAction(
            orderIds,
            emailToken,
        );
        let phoneNo = (data.primaryPhone as any)?.replaceAll("-", "");
        if (!phoneNo?.startsWith("+")) phoneNo = `+1${phoneNo}`;

        // throw new Error("....");
        const tx = await prisma.customerTransaction.create({
            data: {
                wallet: {
                    connectOrCreate: {
                        where: {
                            accountNo: data.primaryPhone,
                        },
                        create: {
                            balance: 0,
                            accountNo: data.primaryPhone,
                        },
                    },
                },
                amount: data.amountDue,
                paymentMethod: "link" as PaymentMethods,
                squarePayment: {
                    create: {
                        status: "PENDING" as SquarePaymentStatus,
                        paymentId: generateRandomString(),
                        // amount: totalAmount,
                        orders: {
                            createMany: {
                                data: data.orders.map((order) => ({
                                    orderId: order.id,
                                })),
                            },
                        },
                        amount: data.amountDue,
                        paymentMethod: "link" as PaymentMethods,
                        tip: 0,
                        checkout: {
                            create: {
                                paymentType: "link" as PaymentMethods,
                            },
                        },
                    },
                },
                type: "transaction" as CustomerTransactionType,
                description: "",
                status: "PENDING" as SquarePaymentStatus,
            },
            include: {
                squarePayment: {
                    include: {
                        checkout: true,
                        orders: true,
                    },
                },
            },
        });
        const redirectUrl = `${getBaseUrl()}/square-payment/${emailToken}/${orderIdsParam}/payment-response/${
            tx.squarePayment?.paymentId
        }`;
        try {
            const resp = await squareClient.checkoutApi.createPaymentLink({
                idempotencyKey: new Date().toISOString(),
                quickPay: {
                    locationId: SQUARE_LOCATION_ID,
                    name: squareSalesNote(orderIds),
                    priceMoney: {
                        amount: BigInt(Math.round(data.amountDue * 100)),
                        currency: "USD",
                    },
                },
                prePopulatedData: {
                    buyerEmail: data.email,
                    buyerPhoneNumber: phoneNo,
                    buyerAddress: {
                        addressLine1: data.address,
                    },
                },
                checkoutOptions: {
                    redirectUrl,
                    askForShippingAddress: false,
                    allowTipping: false,
                },
            });

            // const paymentId = tx.squarePayment.paymentId;
            const { result, statusCode, body: _body } = resp;
            await prisma.squarePayments.update({
                where: {
                    id: tx.squarePayment.id,
                },
                data: {
                    squareOrderId: result.paymentLink.orderId,
                },
            });
            const paymentLink = result.paymentLink;
            return {
                paymentLink: paymentLink?.url,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }) as any);
}
