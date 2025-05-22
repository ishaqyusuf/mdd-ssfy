"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { CheckoutStatus } from "@/app/(v2)/(loggedIn)/sales-v2/_components/_square-payment-modal/action";
import { prisma } from "@/db";

import { __isProd } from "@/lib/is-prod-server";
import { SQUARE_LOCATION_ID, squareClient } from "@/utils/square-utils";
import { ApiError, OrderLineItem, PrePopulatedData } from "square";

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
export async function createSalesPayment(data: CreateSalesPaymentProps) {
    const salesCheckout = await prisma.salesCheckout.create({
        data: {
            amount: Number(data.amount),
            paymentType: `square_${data.type}`,
            status: "no-status",
            orderId: data.orderId,
            terminalId: data.deviceId,
            userId: await userId(),
            meta: {
                email: data.email,
                phone: data.phone,
            } as any,
        },
    });
    data.salesCheckoutId = salesCheckout.id;
    const checkout =
        data.type == "terminal"
            ? await ceateTerminalCheckout(data)
            : await createSalesPaymentLink(data);
    await prisma.salesCheckout.update({
        where: {
            id: salesCheckout.id,
        },
        data: {
            status: "pending",
            paymentId: checkout.id,
            meta: checkout.meta as any,
        },
    });
    return {
        ...checkout,
        paymentId: checkout.id,
        salesCheckoutId: salesCheckout.id,
        squareError: res,
    };
}
async function errorHandler(fn): Promise<{
    errors?: ApiError["errors"];
    error?;
    id?;
    meta?: SquarePaymentMeta;
    paymentUrl?: string;
}> {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof ApiError) {
            return {
                errors: JSON.parse(JSON.stringify(error.errors)),
            };
        }
        console.log(error);

        return { error: `${error?.message} ERROR!` };
    }
}
export async function createSalesPaymentLink(data: CreateSalesPaymentProps) {
    return await errorHandler(async () => {
        const redirectUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/square-payment-response/${data.salesCheckoutId}`;
        const quickPay = !data.items?.length || data.grandTotal != data.amount;
        const resp = await squareClient.checkoutApi.createPaymentLink({
            idempotencyKey: new Date().toISOString(),
            quickPay: !quickPay
                ? undefined
                : {
                      locationId: SQUARE_LOCATION_ID,
                      name:
                          data.description || `payment for ${data.orderIdStr}`,
                      priceMoney: {
                          amount: BigInt(Math.round(data.amount * 100)),
                          currency: "USD",
                      },
                  },
            order: quickPay
                ? undefined
                : {
                      locationId: SQUARE_LOCATION_ID,
                      //   serviceCharges: [
                      //       {
                      //           name: "Total Amount",
                      //           calculationPhase: "TOTAL_PHASE",
                      //           amountMoney: {
                      //               amount: BigInt(data.amount),
                      //               currency: "USD",
                      //           },
                      //       },
                      //   ],
                      //   discounts: [
                      //       {
                      //           amountMoney: {
                      //               amount: BigInt(403400),
                      //               currency: "USD",
                      //           },
                      //           name: "Paid",
                      //       },
                      //   ],
                      //   netAmountDueMoney: {
                      //       amount: BigInt(Math.ceil(data.amount * 100)),
                      //       currency: "USD",
                      //   },
                      lineItems: data.items
                          ?.filter((i) => i.basePriceMoney.amount)
                          ?.map((item) => {
                              if (typeof item.basePriceMoney.amount != "bigint")
                                  item.basePriceMoney.amount = BigInt(
                                      Math.round(item.basePriceMoney.amount),
                                  );
                              return item;
                          }),
                  },
            prePopulatedData: {
                buyerEmail: data.email,
                buyerPhoneNumber: phone(data.phone),
                buyerAddress: data.address,
            },
            checkoutOptions: {
                redirectUrl,
                askForShippingAddress: false,
                allowTipping: data.allowTip,
            },
        });
        const { result, statusCode, body: _body } = resp;
        // result.relatedResources.orders
        const paymentLink = result.paymentLink;
        // result.relatedResources.orders[0].id
        const [order] = result.relatedResources.orders;
        return {
            paymentUrl: paymentLink.url,
            id: paymentLink.id,
            redirectUrl,
            ...result,
            meta: {
                squareOrderId: paymentLink.orderId,
            },
        };
    });
}
// const refreshAccessToken = async (refreshToken) => {
//     try {
//         const { result } = await client.oAuthApi.obtainToken({
//             clientId: process.env.SQUARE_CLIENT_ID,
//             clientSecret: process.env.SQUARE_CLIENT_SECRET,
//             refreshToken,
//             grantType: "authorization_code",
//             code: "",
//         });

//         console.log("New Access Token:", result.accessToken);
//         return result.accessToken;
//     } catch (error) {
//         console.error("Error refreshing token:", error);
//     }
// };
let res;
export async function ceateTerminalCheckout(data: CreateSalesPaymentProps) {
    return await errorHandler(async () => {
        const s = await squareClient.terminalApi.createTerminalCheckout({
            // deviceId: process.env.SQUARE_TERMINAL_DEVICE_ID,
            idempotencyKey: data.salesCheckoutId, // Unique identifier for each transaction
            checkout: {
                amountMoney: {
                    amount: BigInt(Number(data.amount) * 100), // Amount in the smallest currency unit, e.g., cents
                    currency: "USD",
                },
                // deviceId: process.env.SQUARE_TERMINAL_DEVICE_ID , // Your Square Terminal device ID
                deviceOptions: {
                    deviceId: data.deviceId,
                    tipSettings: {
                        allowTipping: data.allowTip,
                    },
                },
                note: data.description || `Payment for ${data.orderIdStr}`,
                referenceId: data.orderIdStr,
                customerId: data.squareCustomerId,
                paymentOptions: {
                    // skipReceipt, // Option to skip the receipt
                },
            },
        });
        res = {
            res: s.result,
            statusCode: s.statusCode,
        };
        // if (s.result.errors.length) throw s.result;

        const checkoutId = s.result.checkout.id;
        // s.result.checkout.orderId
        return {
            id: checkoutId,
            meta: {
                squareOrderId: s.result.checkout.orderId,
            } as SquarePaymentMeta,
        };
    });
}
function phone(pg: string) {
    if (!pg?.includes("+")) pg = `+1 ${pg}`;
    return pg;
}
export type GetSquareDevices = Awaited<ReturnType<typeof getSquareDevices>>;
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
    } catch (error) {
        console.log(error);
    }
}

export async function getSquareTerminalPaymentStatus(
    terminalId,
    salesCheckoutId,
) {
    const payment =
        await squareClient.terminalApi.getTerminalCheckout(terminalId);
    const paymentStatus = payment.result.checkout.status as
        | "PENDING"
        | "IN_PROGRESS"
        | "CANCEL_REQUESTED"
        | "CANCELED"
        | "COMPLETED";
    const tipAmount = payment?.result?.checkout?.tipMoney?.amount;
    if (tipAmount) {
        const checkout = await prisma.salesCheckout.findUnique({
            where: {
                id: salesCheckoutId,
            },
        });
        await prisma.salesCheckout.update({
            where: {
                id: salesCheckoutId,
            },
            data: {
                tip: Number(tipAmount) / 100,
            },
        });
    }

    return paymentStatus;
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
            status: "success" as CheckoutStatus,
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
