import type { PrintMode } from "@gnd/sales/print/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { isSalesPdfSnapshotArtifactsDisabled } from "./sales-document-snapshot-policy";

export type QueueSalesDocumentSnapshotWarmupInput = {
	salesOrderId: number;
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	forceRegenerate?: boolean;
};

export async function queueSalesDocumentSnapshotWarmup(
	input: QueueSalesDocumentSnapshotWarmupInput,
) {
	if (isSalesPdfSnapshotArtifactsDisabled()) {
		return {
			ok: true,
			skipped: true,
			reason: "sales_pdf_snapshot_artifacts_disabled",
			salesOrderId: input.salesOrderId,
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
			templateId: input.templateId ?? "template-2",
		};
	}

	return tasks.trigger("warm-sales-document-snapshot", {
		salesOrderId: input.salesOrderId,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId ?? "template-2",
		forceRegenerate: input.forceRegenerate ?? false,
	});
}

export async function queueSalesDocumentSnapshotWarmups(
	inputs: QueueSalesDocumentSnapshotWarmupInput[],
) {
	const uniqueInputs = Array.from(
		new Map(
			inputs.map((input) => [
				`${input.salesOrderId}:${input.mode}:${input.dispatchId ?? "order"}:${input.templateId ?? "template-2"}:${input.forceRegenerate ? "force" : "reuse"}`,
				input,
			]),
		).values(),
	);

	return Promise.all(
		uniqueInputs.map((input) => queueSalesDocumentSnapshotWarmup(input)),
	);
}
