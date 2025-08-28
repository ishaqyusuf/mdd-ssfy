import { squareSalesPaymentCreatedDta } from "@/app/(clean-code)/(sales)/_common/data-access/wallet/sales-payment-dta";
import { env } from "@/env.mjs";
import { formatMoney } from "@/lib/use-number";
import { squareSalesNote } from "@/utils/sales-utils";
import { Client, Environment } from "square";

import { errorHandler } from "../error/handler";

export type TerminalCheckoutStatus =
    | "PENDING"
    | "IN_PROGRESS"
    | "CANCEL_REQUESTED"
    | "CANCELED"
    | "COMPLETED";
let devMode = env.NODE_ENV != "production";
devMode = false;
const SQUARE_LOCATION_ID = devMode
    ? env.SQUARE_SANDBOX_LOCATION_ID
    : env.SQUARE_LOCATION_ID;
const client = new Client({
    environment: devMode ? Environment.Sandbox : Environment.Production,
    accessToken: devMode
        ? env.SQUARE_SANDBOX_ACCESS_TOKEN
        : env.SQUARE_ACCESS_TOKEN,
});
export async function fetchDevicesByLocations() {
    const {
        result: { locations },
    } = await client.locationsApi.listLocations();
    let allDevices: any[] = [];

    for (const loc of locations ?? []) {
        const { result } = await client.devicesApi.listDevices(
            undefined,
            undefined,
            undefined,
            loc.id,
        );
        allDevices = allDevices.concat(result.devices ?? []);
    }

    return {
        allDevices,
        locations,
    };
}
export async function getSquareDevices() {
    try {
        const devices = await client.devicesApi.listDeviceCodes();
        const devicesList = await client.devicesApi.listDevices();
        const _ = devices?.result?.deviceCodes
            ?.map((device) => ({
                label: device?.name,
                status: device.status as "PAIRED" | "OFFLINE",
                value: device.deviceId,
                // device,
            }))
            .sort((a, b) => a?.label?.localeCompare(b.label) as any);

        // console.log([devicesList.result.devices]);
        return _.filter((a, b) => _.findIndex((c) => c.value == a.value) == b);
    } catch (error) {}
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
    props: CreateTerminalCheckoutProps,
) {
    const amt = formatMoney(props.amount);
    const cent = Math.round(props.amount * 100);
    const amount = BigInt(cent);

    const resp = await client.terminalApi.createTerminalCheckout({
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
    const checkout = resp.result.checkout;
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
        const terminal = await client.terminalApi.createTerminalCheckout({
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
            id: terminal.result.checkout.id,
            squareOrderId: terminal.result.checkout.orderId,
            salesPayment: await squareSalesPaymentCreatedDta(
                idempotencyKey,
                terminal.result.checkout.id,
                terminal.result.checkout.orderId,
            ),
        };
    });
}
export async function getTerminalPaymentStatus(checkoutId) {
    const payment = await client.terminalApi.getTerminalCheckout(checkoutId);
    const paymentStatus = payment.result.checkout
        .status as TerminalCheckoutStatus;
    const tip = Number(payment.result.checkout.tipMoney?.amount);
    return {
        status: paymentStatus,
        tip: tip > 0 ? tip / 100 : 0,
    };
}
export async function cancelSquareTerminalPayment(paymentId) {
    await client.terminalApi.cancelTerminalCheckout(paymentId);
}

// export async function squarePaymentUpdated(props: SquarePayment) {
//     const response = await client.terminalApi.createTerminalCheckout(
//         checkoutId
//     );
// }
