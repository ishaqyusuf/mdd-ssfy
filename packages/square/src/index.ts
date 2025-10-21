import { env } from "process";
import {
  SquareClient as Client,
  SquareEnvironment as Environment,
  SquareError as ApiError,
} from "square";
import { TransactionClient } from "@gnd/db";
import crypto from "crypto";

let devMode = env.NODE_ENV !== "production";
export const squareClient = new Client({
  environment: devMode ? Environment.Sandbox : Environment.Production,
  token: devMode ? env.SQUARE_SANDBOX_ACCESS_TOKEN : env.SQUARE_ACCESS_TOKEN,
});
export const SQUARE_LOCATION_ID = devMode
  ? env.SQUARE_SANDBOX_LOCATION_ID
  : env.SQUARE_LOCATION_ID;
interface SquareCreateRefundProps {
  squarePaymentId: string;
  tx: TransactionClient;
  reason;
  amount;
  author: string;
  note?: string;
}
export async function squareCreateRefund({
  squarePaymentId,
  tx,
  reason,
  amount,
  author,
  note,
}: SquareCreateRefundProps) {
  try {
    if (!amount) {
      // const { result } = await squareClient.paymentsApi.getPayment(
      //   squarePaymentId
      // );
      // amount = Number(result.payment!.amountMoney!.amount) / 100;
      const payment = await squareClient.payments.get({
        paymentId: squarePaymentId,
      });
      amount = Number(payment.payment?.amountMoney?.amount) / 100;
    }
    // const resp = await squareClient.refundsApi.refundPayment({
    //   idempotencyKey: crypto.randomUUID(),
    //   paymentId: squarePaymentId,
    //   amountMoney: {
    //     amount: BigInt(Math.round(amount * 100)), // convert to cents
    //     currency: "USD", // Or from env if supporting multiple currencies
    //   },
    //   reason: reason || "Customer request",
    // });
    const resp = await squareClient.refunds.refundPayment({
      idempotencyKey: crypto.randomUUID(),
      paymentId: squarePaymentId,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // convert to cents
        currency: "USD", // Or from env if supporting multiple currencies
      },
      reason: reason || "Customer request",
    });
    // const refundId = resp.result.refund?.id;
    await tx.squareRefunds.create({
      data: {
        author,
        reason,
        paymentId: squarePaymentId,
        note,
        // refundId: resp?.refund?.id,
      },
    });
  } catch (error) {
    const err = error as ApiError;
    return {
      success: false,
      error: err?.errors || (error as Error).message,
    };
  }
}

export async function getSquareDevices() {
  try {
    console.log("GETTING DEVICE>>>", { devMode });
    // const devices = await squareClient.devicesApi.listDeviceCodes();
    const devices = await squareClient.devices.list();
    console.log(devices);
    // const devicesList = await squareClient.devicesApi.listDevices();
    // const _ = devices?.result?.deviceCodes
    //   ?.map((device) => ({
    //     label: device?.name,
    //     status: device.status as "PAIRED" | "OFFLINE",
    //     value: device.deviceId,
    //     // device,
    //   }))
    //   .sort((a, b) => a?.label?.localeCompare(b.label as any) as any);
    const _ = devices?.data
      ?.map((device) => ({
        label: device?.attributes.name,
        // status: device?.status as "PAIRED" | "OFFLINE",
        status: "PAIRED",
        value: device.id,
        // value: device.deviceId,
        // value: device?.attributes?.
        // device,
      }))
      .sort((a, b) => a?.label?.localeCompare(b.label as any) as any);

    return (_ || [])!?.filter(
      (a, b) => _!.findIndex((c) => c.value == a.value) == b
    );
  } catch (error) {
    console.log("ERROR", error);
  }
  return [];
}
export async function fetchDevicesByLocations() {
  const {
    // result: { locations },
    locations,
  } = await squareClient.locations.list();
  let allDevices: any[] = [];

  for (const loc of locations ?? []) {
    const { data } = await squareClient.devices.list(
      {
        locationId: loc.id,
      }
      // undefined,
      // undefined,
      // undefined,
      // loc.id
    );
    allDevices = allDevices.concat(data ?? []);
  }

  return {
    allDevices,
    locations,
  };
}
