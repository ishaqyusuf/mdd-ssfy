import { getSquareDevices, squareClient } from "@gnd/square";
import { generateRandomString } from "@gnd/utils";

export async function getSquareDevicesAction() {
    return getSquareDevices();
}
export async function createDeviceCode() {
    const resp = await squareClient.devices.codes.create({
        idempotencyKey: generateRandomString(),
        deviceCode: {
            productType: "TERMINAL_API",
            name: "GND-PRODESK",
        },
    });
    return resp?.deviceCode;
}
export async function testRun(deviceId) {
    const amount = BigInt(1000);
    // const resp = await client.terminalApi.createTerminalCheckout({
    // const resp = await client.terminalApi.createTerminalCheckout({
    const { checkout, errors } = await squareClient.terminal.checkouts.create({
        idempotencyKey: new Date().toISOString(),
        checkout: {
            amountMoney: {
                amount,
                currency: "USD",
            },
            // note: squareSalesNote(props.orderIds),
            deviceOptions: {
                deviceId: deviceId,
            },
        },
    });
    return {
        errors,
        checkout,
    };
}

