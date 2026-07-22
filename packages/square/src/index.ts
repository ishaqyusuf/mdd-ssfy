import crypto from "node:crypto";
import { env } from "node:process";
import type { TransactionClient } from "@gnd/db";
import {
  SquareError as ApiError,
  SquareClient as Client,
  type DeviceStatusCategory,
  SquareEnvironment as Environment,
} from "square";

export function isProductionSquareEnvironment(runtime: NodeJS.ProcessEnv) {
  return (
    runtime.NODE_ENV === "production" ||
    runtime.VERCEL_ENV === "production" ||
    runtime.SQUARE_FORCE_PRODUCTION === "true"
  );
}

export const SQUARE_MODE = isProductionSquareEnvironment(env)
  ? "production"
  : "sandbox";
const devMode = SQUARE_MODE === "sandbox";
export const squareClient = new Client({
  environment: devMode ? Environment.Sandbox : Environment.Production,
  token: devMode ? env.SQUARE_SANDBOX_ACCESS_TOKEN : env.SQUARE_ACCESS_TOKEN,
});
export const SQUARE_LOCATION_ID = devMode
  ? env.SQUARE_SANDBOX_LOCATION_ID
  : env.SQUARE_LOCATION_ID;

export const normalizeTerminalDeviceId = (deviceId: string) =>
  deviceId.replace(/^device:/, "");

type SquareTerminalDevice = {
  attributes?: { name?: string | null } | null;
  id?: string | null;
  status?: { category?: DeviceStatusCategory | null } | null;
};

type SquareTerminalDeviceCode = {
  deviceId?: string | null;
  productType?: string | null;
  status?: string | null;
};

export function resolvePairedSquareTerminals(
  devices: SquareTerminalDevice[],
  deviceCodes: SquareTerminalDeviceCode[],
) {
  const pairedDeviceIds = new Set(
    deviceCodes.flatMap((code) =>
      code.status === "PAIRED" &&
      code.productType === "TERMINAL_API" &&
      code.deviceId
        ? [normalizeTerminalDeviceId(code.deviceId)]
        : [],
    ),
  );

  return devices
    .filter(
      (device) =>
        device.id &&
        pairedDeviceIds.has(normalizeTerminalDeviceId(device.id)),
    )
    .map((device) => ({
      label: device.attributes?.name || "Square Terminal",
      status: device.status?.category || undefined,
      value: device.id || undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .filter(
      (terminal, index, terminals) =>
        terminals.findIndex((candidate) => candidate.value === terminal.value) ===
        index,
    );
}
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
    const [devices, deviceCodes] = await Promise.all([
      squareClient.devices.list(
        SQUARE_LOCATION_ID ? { locationId: SQUARE_LOCATION_ID } : undefined,
      ),
      squareClient.devices.codes.list(
        SQUARE_LOCATION_ID ? { locationId: SQUARE_LOCATION_ID } : undefined,
      ),
    ]);
    const terminals = resolvePairedSquareTerminals(
      devices?.data ?? [],
      deviceCodes?.data ?? [],
    );
    if (!terminals.length) {
      return {
        errors: [
          {
            category: "API_ERROR",
            code: "UNPAIRED_TERMINAL",
            detail:
              "No Square Terminal is paired to the GND production app. Pair the terminal with a GND Devices API code before checkout.",
          },
        ],
        terminals: [],
      };
    }
    return {
      terminals,
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
  return {
    errors: [
      {
        category: "API_ERROR",
        code: "INTERNAL_SERVER_ERROR",
        detail: "Unable to load Square terminals.",
      },
    ],
    terminals: [],
  };
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
        },
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

export type TerminalCheckoutStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "CANCEL_REQUESTED"
  | "CANCELED"
  | "COMPLETED";

export interface CreateTerminalCheckoutProps {
  deviceId: string;
  deviceName?: string;
  allowTipping?: boolean;
  amount: number;
  idempotencyKey?: string;
  orderIds?: string[];
}

const formatSquareErrors = (
  errors?: { code?: string; detail?: string; category?: string }[],
) => {
  if (!errors?.length) return null;
  return errors
    .map((error) =>
      [error.category, error.code, error.detail].filter(Boolean).join(": "),
    )
    .join(" | ");
};

const terminalCheckoutErrorHandler = async <T>(fn: () => Promise<T>) => {
  try {
    return {
      resp: await fn(),
      error: null as { message: string } | null,
    };
  } catch (error) {
    return {
      resp: null as T | null,
      error: {
        message:
          (error as Error)?.message || "Square terminal checkout failed.",
      },
    };
  }
};

const toSquareSalesNote = (orderIds?: string[]) => {
  const ids = (orderIds || []).filter(Boolean);
  if (!ids.length) return "sales payment";
  return `sales payment for order${ids.length > 1 ? "s" : ""} ${ids.join(
    ", ",
  )}`;
};

export async function createSquareTerminalCheckout(
  props: CreateTerminalCheckoutProps,
) {
  if (!props?.deviceId) throw new Error("Square terminal device is required.");
  if (!props?.amount || Number(props.amount) <= 0)
    throw new Error("Payment amount must be greater than zero.");

  const cent = Math.round(Number(props.amount) * 100);
  const amount = BigInt(cent);
  const { checkout, errors } = await squareClient.terminal.checkouts.create({
    idempotencyKey: props.idempotencyKey || new Date().toISOString(),
    checkout: {
      amountMoney: {
        amount,
        currency: "USD",
      },
      locationId: SQUARE_LOCATION_ID,
      note: toSquareSalesNote(props.orderIds),
      deviceOptions: {
        deviceId: normalizeTerminalDeviceId(props.deviceId),
        tipSettings: {
          allowTipping: props.allowTipping,
        },
      },
    },
  });

  const errorMessage = formatSquareErrors(errors as any);
  if (errorMessage) throw new Error(`Square checkout failed: ${errorMessage}`);
  if (!checkout?.id)
    throw new Error("Square checkout failed: missing checkout id.");

  return {
    id: checkout.id,
    squareOrderId: checkout.orderId,
  };
}

export async function verifySquareTerminalReady(deviceId: string) {
  const normalizedDeviceId = normalizeTerminalDeviceId(deviceId);
  const { action } = await squareClient.terminal.actions.create({
    idempotencyKey: crypto.randomUUID(),
    action: {
      deadlineDuration: "PT10S",
      deviceId: normalizedDeviceId,
      type: "PING",
    },
  });
  if (!action?.id) {
    throw new Error("Square could not start a terminal readiness check.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    const currentAction =
      attempt === 0
        ? action
        : (await squareClient.terminal.actions.get({ actionId: action.id })).action;
    if (currentAction?.status === "COMPLETED") return;
    if (
      currentAction?.status === "CANCELED" ||
      currentAction?.status === "CANCEL_REQUESTED"
    ) {
      break;
    }
  }

  throw new Error(
    "The selected Square Terminal is not responding in Connected mode. On the terminal, sign out of Square POS and sign in with its GND device code, then try again.",
  );
}

export async function createTerminalCheckout({
  deviceId,
  idempotencyKey,
  amount,
  allowTipping,
}: CreateTerminalCheckoutProps) {
  return await terminalCheckoutErrorHandler(async () => {
    const { checkout, errors } = await squareClient.terminal.checkouts.create({
      idempotencyKey: idempotencyKey || new Date().toISOString(),
      checkout: {
        amountMoney: {
          amount: BigInt(Number(amount) * 100),
          currency: "USD",
        },
        locationId: SQUARE_LOCATION_ID,
        deviceOptions: {
          deviceId: normalizeTerminalDeviceId(deviceId),
          tipSettings: {
            allowTipping,
          },
        },
        referenceId: "",
      },
    });

    const errorMessage = formatSquareErrors(errors as any);
    if (errorMessage)
      throw new Error(`Square checkout failed: ${errorMessage}`);
    if (!checkout?.id)
      throw new Error("Square checkout failed: missing checkout id.");

    return {
      id: checkout.id,
      squareOrderId: checkout.orderId,
      salesPayment: null,
    };
  });
}

export async function getTerminalPaymentStatus(checkoutId: string) {
  const { checkout } = await squareClient.terminal.checkouts.get({
    checkoutId,
  });
  const paymentStatus = checkout?.status as TerminalCheckoutStatus;
  const tip = Number(checkout?.tipMoney?.amount);
  return {
    status: paymentStatus,
    tip: tip > 0 ? tip / 100 : 0,
  };
}

export async function cancelSquareTerminalPayment(checkoutId: string) {
  await squareClient.terminal.dismissTerminalCheckout({
    checkoutId,
  });
}
