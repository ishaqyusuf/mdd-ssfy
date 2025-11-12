import { getSquareDevices, squareClient } from "@gnd/square";

export async function getSquareDevicesAction() {
    return getSquareDevices();
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

