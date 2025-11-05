import { squareSalesPaymentCreatedDta } from "@/app-deps/(clean-code)/(sales)/_common/data-access/wallet/sales-payment-dta";
import { env } from "@/env.mjs";
import { formatMoney } from "@/lib/use-number";
import { squareSalesNote } from "@/utils/sales-utils";
import { squareClient } from "@gnd/square";

import { errorHandler } from "../error/handler";
import {
    getSquareDevices as getSquareDevices2,
    fetchDevicesByLocations as fetchDevicesByLocations2,
} from "@gnd/square";
import { consoleLog } from "@gnd/utils";

export type TerminalCheckoutStatus =
    | "PENDING"
    | "IN_PROGRESS"
    | "CANCEL_REQUESTED"
    | "CANCELED"
    | "COMPLETED";
let devMode = env.NODE_ENV != "production";
devMode = false;

export async function fetchDevicesByLocations() {
    return fetchDevicesByLocations2();
}
export async function getSquareDevices() {
    return getSquareDevices2();
}
export interface CreateTerminalCheckoutProps {
    deviceId;
    deviceName?;
    allowTipping?: boolean;
    amount;
    idempotencyKey?;
    orderIds: string[];
}
export async function createSquareTerminalCheckout(
    props: CreateTerminalCheckoutProps
) {
    const amt = formatMoney(props.amount);
    const cent = Math.round(props.amount * 100);
    const amount = BigInt(cent);
    // const resp = await client.terminalApi.createTerminalCheckout({
    // const resp = await client.terminalApi.createTerminalCheckout({
    const { checkout, errors } = await squareClient.terminal.checkouts.create({
        idempotencyKey: props.idempotencyKey || new Date().toISOString(),
        checkout: {
            amountMoney: {
                amount,
                currency: "USD",
            },
            note: squareSalesNote(props.orderIds),
            deviceOptions: {
                deviceId: props.deviceId,
                tipSettings: {
                    allowTipping: props.allowTipping,
                },
            },
        },
    });
    consoleLog("DATA", props);
    // const checkout = resp.result.checkout;
    return {
        id: checkout.id,
        squareOrderId: checkout.orderId,
    };
}
export async function createTerminalCheckout({
    deviceId,
    idempotencyKey,
    amount,
    allowTipping,
}: CreateTerminalCheckoutProps) {
    return await errorHandler(async () => {
        // const terminal = await client.terminalApi.createTerminalCheckout({
        const { checkout, errors } =
            await squareClient.terminal.checkouts.create({
                idempotencyKey,
                checkout: {
                    amountMoney: {
                        amount: BigInt(Number(amount) * 100),
                        currency: "USD",
                    },
                    deviceOptions: {
                        deviceId,
                        tipSettings: {
                            allowTipping,
                        },
                    },
                    referenceId: "",
                },
            });
        return {
            id: checkout.id,
            squareOrderId: checkout.orderId,
            salesPayment: await squareSalesPaymentCreatedDta(
                idempotencyKey,
                checkout.id,
                checkout.orderId
            ),
        };
    });
}
export async function getTerminalPaymentStatus(checkoutId) {
    // const payment = await client.terminalApi.getTerminalCheckout(checkoutId);
    const { checkout, errors } = await squareClient.terminal.checkouts.get({
        checkoutId,
    });
    // const paymentStatus = payment.result.checkout
    // .status as TerminalCheckoutStatus;
    const paymentStatus = checkout.status as TerminalCheckoutStatus;
    const tip = Number(checkout.tipMoney?.amount);
    return {
        status: paymentStatus,
        tip: tip > 0 ? tip / 100 : 0,
    };
}
export async function cancelSquareTerminalPayment(checkoutId) {
    // await client.terminalApi.cancelTerminalCheckout(paymentId);
    await squareClient.terminal.dismissTerminalCheckout({
        checkoutId,
    });
}

// export async function squarePaymentUpdated(props: SquarePayment) {
//     const response = await client.terminalApi.createTerminalCheckout(
//         checkoutId
//     );
// }
