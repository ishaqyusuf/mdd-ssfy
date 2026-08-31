import type { Db, TransactionClient } from "@gnd/db";

const TERMINAL_FULFILLMENT_STATUSES = new Set(["completed", "delivered"]);
const NON_ACTIVE_FULFILLMENT_STATUSES = new Set([
	...TERMINAL_FULFILLMENT_STATUSES,
	"cancelled",
]);
const SERIALIZABLE_RETRY_CODES = new Set(["P2028", "P2034"]);

export type FulfillmentDispatchResolution = {
	salesId: number;
	orderNo: string;
	dispatchId: number | null;
	state: "ready" | "already_fulfilled";
	created: boolean;
};

function normalizeDispatchStatus(status: string | null | undefined) {
	return String(status || "")
		.trim()
		.toLowerCase();
}

function isSerializableRetry(error: unknown) {
	if (!error || typeof error !== "object") return false;
	return SERIALIZABLE_RETRY_CODES.has(
		String((error as { code?: unknown }).code || ""),
	);
}

async function resolveInTransaction(
	tx: TransactionClient,
	input: {
		salesId: number;
		createdById: number;
		now: Date;
	},
): Promise<FulfillmentDispatchResolution> {
	const sale = await tx.salesOrders.findFirstOrThrow({
		where: {
			id: input.salesId,
			type: "order",
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
			deliveredAt: true,
			deliveryOption: true,
			deliveries: {
				where: { deletedAt: null },
				orderBy: [{ dueDate: "desc" }, { id: "desc" }],
				select: {
					id: true,
					status: true,
				},
			},
		},
	});
	const completedDispatch = sale.deliveries.find((dispatch) =>
		TERMINAL_FULFILLMENT_STATUSES.has(normalizeDispatchStatus(dispatch.status)),
	);
	if (sale.deliveredAt || completedDispatch) {
		return {
			salesId: sale.id,
			orderNo: sale.orderId,
			dispatchId: completedDispatch?.id ?? null,
			state: "already_fulfilled",
			created: false,
		};
	}
	const existingDispatch = sale.deliveries.find(
		(dispatch) =>
			!NON_ACTIVE_FULFILLMENT_STATUSES.has(
				normalizeDispatchStatus(dispatch.status),
			),
	);
	if (existingDispatch) {
		return {
			salesId: sale.id,
			orderNo: sale.orderId,
			dispatchId: existingDispatch.id,
			state: "ready",
			created: false,
		};
	}
	const dispatch = await tx.orderDelivery.create({
		data: {
			deliveryMode: sale.deliveryOption === "pickup" ? "pickup" : "delivery",
			createdBy: { connect: { id: input.createdById } },
			status: "queue",
			dueDate: input.now,
			meta: {},
			order: { connect: { id: sale.id } },
		},
		select: { id: true },
	});
	return {
		salesId: sale.id,
		orderNo: sale.orderId,
		dispatchId: dispatch.id,
		state: "ready",
		created: true,
	};
}

export async function ensureSalesOrderFulfillmentDispatch(
	db: Db,
	input: {
		salesId: number;
		createdById: number;
		now?: Date;
		maxAttempts?: number;
	},
) {
	const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 3, 5));
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await db.$transaction(
				(tx) =>
					resolveInTransaction(tx, {
						salesId: input.salesId,
						createdById: input.createdById,
						now: input.now ?? new Date(),
					}),
				{ isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (attempt >= maxAttempts || !isSerializableRetry(error)) throw error;
		}
	}
	throw new Error("Unable to resolve fulfillment dispatch.");
}
