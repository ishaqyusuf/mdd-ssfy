import { env } from "process";
import { ApiError, Client, Environment } from "square";
import { TransactionClient } from "@gnd/db";
import crypto from "crypto";
import { nanoid } from "nanoid";
let devMode = env.NODE_ENV != "production";
export const squareClient = new Client({
  environment: devMode ? Environment.Sandbox : Environment.Production,
  accessToken: devMode
    ? env.SQUARE_SANDBOX_ACCESS_TOKEN
    : env.SQUARE_ACCESS_TOKEN,
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
      const { result } =
        await squareClient.paymentsApi.getPayment(squarePaymentId);
      amount = Number(result.payment!.amountMoney!.amount) / 100;
    }
    const resp = await squareClient.refundsApi.refundPayment({
      idempotencyKey: crypto.randomUUID(),
      paymentId: squarePaymentId,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // convert to cents
        currency: "USD", // Or from env if supporting multiple currencies
      },
      reason: reason || "Customer request",
    });
    const refundId = resp.result.refund?.id;
    await tx.squareRefunds.create({
      data: {
        author,
        reason,
        paymentId: squarePaymentId,
        note,
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

export async function squareCreateDeviceCode() {
  const code = await squareClient.devicesApi.createDeviceCode({
    idempotencyKey: nanoid(),
    deviceCode: {
      name: "Code ...",
      productType: "TERMINAL_API",
      locationId: SQUARE_LOCATION_ID,
    },
  });
}
