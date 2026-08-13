import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import type { Db } from "@gnd/db";

const SPECIAL_ORDER_DOCUMENT_PREFIXES = [
	"invoice_pdf",
	"production_pdf",
	"packing_slip_pdf",
	"order_packing_pdf",
];

const SPECIAL_ORDER_DOCUMENT_MODES = [
	"invoice",
	"production",
	"packing-slip",
	"order-packing",
] as const;

export async function refreshSpecialOrderSalesDocuments(input: {
	db: Db;
	salesOrderId: number;
	reason: string;
}) {
	const expiry = await expireCurrentSalesDocumentSnapshots({
		db: input.db,
		salesOrderId: input.salesOrderId,
		reason: input.reason,
		documentPrefixes: SPECIAL_ORDER_DOCUMENT_PREFIXES,
	});
	const warmups = await queueSalesDocumentSnapshotWarmups(
		SPECIAL_ORDER_DOCUMENT_MODES.map((mode) => ({
			salesOrderId: input.salesOrderId,
			mode,
			forceRegenerate: true,
		})),
	);
	return { expiry, warmups };
}
