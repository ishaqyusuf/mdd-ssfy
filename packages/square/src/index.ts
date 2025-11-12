import { env } from "process";
import {
  SquareClient as Client,
  SquareEnvironment as Environment,
  SquareError as ApiError,
  DeviceStatus,
  DeviceStatusCategory,
} from "square";
import { TransactionClient } from "@gnd/db";
import crypto from "crypto";
import { consoleLog, formatMoney, RenturnTypeAsync } from "@gnd/utils";
let devMode = env.NODE_ENV === "production";
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
  if (!checkout) throw new Error("...");
  consoleLog("DATA", props);
  // const checkout = resp.result.checkout;
  return {
    id: checkout.id,
    squareOrderId: checkout.orderId,
  };
}
