import crypto from "node:crypto";
import { env } from "node:process";
import type { TransactionClient } from "@gnd/db";
import {
	SquareError as ApiError,
	SquareClient as Client,
	type Currency,
	type DeviceStatusCategory,
	SquareEnvironment as Environment,
	WebhooksHelper,
} from "square";

export function isProductionSquareEnvironment(runtime: NodeJS.ProcessEnv) {
	// A stale local override must never point developer traffic at live Square.
	// Production deployments still select production unconditionally.
	if (runtime.NODE_ENV === "development") return false;
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
export const SQUARE_SANDBOX_TERMINAL_DEVICE_ID =
	"9fa747a2-25ff-48ee-b078-04381f7c828f";
export const squareClient = new Client({
	environment: devMode ? Environment.Sandbox : Environment.Production,
	token: devMode ? env.SQUARE_SANDBOX_ACCESS_TOKEN : env.SQUARE_ACCESS_TOKEN,
});
export const SQUARE_LOCATION_ID = devMode
	? env.SQUARE_SANDBOX_LOCATION_ID
	: env.SQUARE_LOCATION_ID;

export type SquareRefundResult = {
	id: string;
	paymentId: string;
	status: string;
	amountCents: number;
	currency: string;
	reason: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	locationId: string | null;
};

function normalizeSquareRefund(refund: {
	id: string;
	paymentId?: string | null;
	status?: string | null;
	amountMoney: { amount?: bigint | null; currency?: string | null };
	reason?: string | null;
	createdAt?: string;
	updatedAt?: string;
	locationId?: string | null;
}): SquareRefundResult {
	if (!refund.paymentId)
		throw new Error("Square refund is missing its payment id.");
	return {
		id: refund.id,
		paymentId: refund.paymentId,
		status: refund.status || "UNKNOWN",
		amountCents: Number(refund.amountMoney.amount || 0),
		currency: refund.amountMoney.currency || "USD",
		reason: refund.reason || null,
		createdAt: refund.createdAt ? new Date(refund.createdAt) : null,
		updatedAt: refund.updatedAt ? new Date(refund.updatedAt) : null,
		locationId: refund.locationId || null,
	};
}

export async function createSquarePaymentRefund(input: {
	providerPaymentId: string;
	amountCents: number;
	currency?: string;
	idempotencyKey: string;
	reason: string;
}) {
	const response = await squareClient.refunds.refundPayment({
		idempotencyKey: input.idempotencyKey,
		paymentId: input.providerPaymentId,
		amountMoney: {
			amount: BigInt(input.amountCents),
			currency: (input.currency || "USD") as Currency,
		},
		reason: input.reason,
	});
	if (!response.refund) throw new Error("Square did not return the refund.");
	return normalizeSquareRefund(response.refund);
}

export async function getSquarePaymentRefund(refundId: string) {
	const response = await squareClient.refunds.get({ refundId });
	if (!response.refund) throw new Error("Square refund was not found.");
	return normalizeSquareRefund(response.refund);
}

export async function listSquarePaymentRefunds(
	input: {
		beginTime?: string;
		updatedAtBeginTime?: string;
	} = {},
) {
	const page = await squareClient.refunds.list({
		...input,
		locationId: SQUARE_LOCATION_ID,
		limit: 100,
	});
	const refunds = [] as SquareRefundResult[];
	for await (const refund of page) refunds.push(normalizeSquareRefund(refund));
	return refunds;
}

export async function getSquareTenderPayment(providerPaymentId: string) {
	const { payment } = await squareClient.payments.get({
		paymentId: providerPaymentId,
	});
	if (!payment?.id) throw new Error("Square payment was not found.");
	return {
		providerPaymentId: payment.id,
		providerOrderId: payment.orderId || null,
		status: payment.status || "UNKNOWN",
		amountCents: Number(payment.amountMoney?.amount || 0),
		tipCents: Number(payment.tipMoney?.amount || 0),
		currency: payment.amountMoney?.currency || "USD",
		locationId: payment.locationId || null,
		paidAt: payment.updatedAt ? new Date(payment.updatedAt) : null,
		processingFeeCents: (payment.processingFee || []).reduce(
			(sum, fee) => sum + Number(fee.amountMoney?.amount || 0),
			0,
		),
	};
}

export function verifySquareWebhookSignature(input: {
	rawBody: string;
	signatureHeader: string;
	signatureKey: string;
	notificationUrl: string;
}) {
	return WebhooksHelper.verifySignature({
		requestBody: input.rawBody,
		signatureHeader: input.signatureHeader,
		signatureKey: input.signatureKey,
		notificationUrl: input.notificationUrl,
	});
}

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
				device.id && pairedDeviceIds.has(normalizeTerminalDeviceId(device.id)),
		)
		.map((device) => ({
			label: device.attributes?.name || "Square Terminal",
			status: device.status?.category || undefined,
			value: device.id || undefined,
		}))
		.sort((a, b) => a.label.localeCompare(b.label))
		.filter(
			(terminal, index, terminals) =>
				terminals.findIndex(
					(candidate) => candidate.value === terminal.value,
				) === index,
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
	if (devMode) {
		return {
			terminals: [
				{
					label: "Square Sandbox Terminal",
					status: "AVAILABLE",
					value: SQUARE_SANDBOX_TERMINAL_DEVICE_ID,
				},
			],
		};
	}

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

type SquareTerminalActionStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "CANCEL_REQUESTED"
	| "CANCELED"
	| "COMPLETED"
	| string
	| null
	| undefined;

interface WaitForSquareTerminalActionReadyProps {
	initialStatus: SquareTerminalActionStatus;
	getStatus: () => Promise<SquareTerminalActionStatus>;
	maxWaitMs: number;
	pollIntervalMs: number;
	sleep?: (milliseconds: number) => Promise<void>;
}

export async function waitForSquareTerminalActionReady({
	initialStatus,
	getStatus,
	maxWaitMs,
	pollIntervalMs,
	sleep = (milliseconds) =>
		new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: WaitForSquareTerminalActionReadyProps) {
	let status = initialStatus;
	let elapsedMs = 0;

	while (true) {
		if (status === "COMPLETED") return true;
		if (status === "CANCELED" || status === "CANCEL_REQUESTED") return false;
		if (elapsedMs >= maxWaitMs) return false;

		await sleep(pollIntervalMs);
		elapsedMs += pollIntervalMs;
		status = await getStatus();
	}
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
	if (devMode) return;

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
	const actionId = action.id;

	const ready = await waitForSquareTerminalActionReady({
		initialStatus: action.status,
		getStatus: async () =>
			(await squareClient.terminal.actions.get({ actionId })).action?.status,
		maxWaitMs: 12_000,
		pollIntervalMs: 1_000,
	});
	if (ready) return;

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
		paymentIds: checkout?.paymentIds || [],
	};
}

export async function cancelSquareTerminalPayment(checkoutId: string) {
	const { checkout } = await squareClient.terminal.checkouts.cancel({
		checkoutId,
	});
	return {
		status: checkout?.status as TerminalCheckoutStatus,
	};
}
