"use server";
import { getSquareDevices, squareClient } from "@gnd/square";
import { randomUUID } from "crypto";
export async function getSquareDevicesAction() {
    return getSquareDevices();
}
export async function createDeviceCode() {
    const resp = await squareClient.devices.codes.create({
        idempotencyKey: randomUUID(),
        deviceCode: {
            productType: "TERMINAL_API",
            name: "GND-PRODESK",
            // deviceId:
        },
    });
    return resp?.deviceCode;
}
export async function testRun(deviceId) {
    const amount = BigInt(1000);
    // const resp = await client.terminalApi.createTerminalCheckout({
    // const resp = await client.terminalApi.createTerminalCheckout({
    const { checkout, errors } = await squareClient.terminal.checkouts.create({
        idempotencyKey: randomUUID(),
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
    console.log({
        errors,
        checkout,
    });
    return {
        errors,
        checkout,
    };
}

