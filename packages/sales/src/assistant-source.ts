import type { Database } from "@gnd/db";
import {
	type AssistantBusinessActor,
	getAssistantSalesOrderById,
} from "@gnd/db/queries";
import {
	buildCanonicalSalesSourceRevision,
	getSalesPipelineSnapshots,
} from "./sales-pipeline-order";

const paymentBearingSalesDocumentModes = new Set([
	"invoice",
	"invoice_pdf",
	"quote",
	"quote_pdf",
	"order-packing",
	"order_packing_pdf",
]);

export function salesDocumentModeRequiresPaymentAccess(mode: string) {
	return paymentBearingSalesDocumentModes.has(mode);
}

export async function getAuthorizedCanonicalSalesSource(
	db: Database,
	actor: AssistantBusinessActor,
	salesOrderId: number,
) {
	const order = await getAssistantSalesOrderById(db, actor, salesOrderId);
	if (!order) return null;
	const pipeline = (await getSalesPipelineSnapshots(db, [salesOrderId])).get(
		salesOrderId,
	);
	if (!pipeline) return null;
	return {
		order,
		pipeline,
		revision: buildCanonicalSalesSourceRevision({
			orderRevision: order.revision,
			pipelineRevision: pipeline.revision,
		}),
	};
}
