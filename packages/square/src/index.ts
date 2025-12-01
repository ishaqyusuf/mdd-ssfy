import { env } from "process";
import {
  SquareClient as Client,
  SquareEnvironment as Environment,
  SquareError as ApiError,
  DeviceStatusCategory,
} from "square";
import { TransactionClient } from "@gnd/db";
import crypto from "crypto";
const isProd = env.NODE_ENV === "production";
const isDebugging = true;
let devMode = !isProd || (!isProd && !isDebugging);
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

interface Devices {
  terminals: { label; status?: DeviceStatusCategory; value?: string }[];
  errors?: ApiError["errors"] | null | undefined;
}
export async function getSquareDevices(): Promise<Devices> {
  try {
    // const terminals = await squareClient.devices.codes
    const devices = await squareClient.devices.list();
    const _ = devices?.data
      ?.map((device) => ({
        label: device?.attributes.name,
        status: device?.status?.category, // as "PAIRED" | "OFFLINE",
        value: device.id,
      }))
      .sort((a, b) => a?.label?.localeCompare(b.label as any) as any);
    return {
      terminals: (_ || [])!?.filter(
        (a, b) => _!.findIndex((c) => c.value == a.value) == b
      ),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        // error: error?.errors?.[0],
        errors: error?.errors,
        terminals: [],
      };
    }
  }
  return {} as any;
}
export async function fetchDevicesByLocations() {
  try {
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
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        error: error.errors?.[0],
        allDevices: [],
        locations: [],
      };
    }
  }
}
