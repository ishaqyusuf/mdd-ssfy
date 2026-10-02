import type { Db, TransactionClient } from "@gnd/db";
import { receiveInboundShipment } from "@gnd/inventory";
import {
	allocateReceivedInboundToBackordersInTransaction,
	runSerializableInventoryTransaction,
} from "./sales-fulfillment-plan";

type ReceiptInput = Parameters<typeof receiveInboundShipment>[1];
type ReceiptDependencies = {
	allocate?: typeof allocateReceivedInboundToBackordersInTransaction;
};

export async function receiveSalesInboundShipmentInTransaction(
	tx: TransactionClient,
	input: ReceiptInput,
	dependencies: ReceiptDependencies = {},
) {
	const receipt = await receiveInboundShipment(tx, input);
	// Include earlier partial receipts so a repeat can safely recover old gaps.
	const demands = await tx.inboundDemand.findMany({
		where: {
			deletedAt: null,
			qtyReceived: { gt: 0 },
			status: { in: ["partially_received", "received"] },
			inboundShipmentItem: { inboundId: input.inboundId, deletedAt: null },
		},
		select: { id: true },
		orderBy: { id: "asc" },
	});
	let allocatedQty = 0;
	let remainingBackorderQty = 0;
	for (let offset = 0; offset < demands.length; offset += 200) {
		const result = await (
			dependencies.allocate ?? allocateReceivedInboundToBackordersInTransaction
		)(tx, {
			inboundDemandIds: demands
				.slice(offset, offset + 200)
				.map((demand) => demand.id),
			limit: 200,
			authorName: input.authorName,
			note: `Reserved from inbound shipment #${input.inboundId}.`,
		});
		allocatedQty += result.allocatedQty;
		remainingBackorderQty += result.remainingBackorderQty;
	}
	return {
		...receipt,
		allocation: {
			state: "completed" as const,
			allocatedQty,
			remainingBackorderQty,
		},
	};
}

export function receiveSalesInboundShipment(
	db: Db,
	input: ReceiptInput,
	dependencies: ReceiptDependencies = {},
) {
	return runSerializableInventoryTransaction(db, (tx) =>
		receiveSalesInboundShipmentInTransaction(tx, input, dependencies),
	);
}
