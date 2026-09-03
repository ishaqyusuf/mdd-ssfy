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

type SalesDocumentWarmupPayload = {
	salesOrderId: number;
	mode: PrintMode;
	dispatchId: number | null;
	templateId: string;
	forceRegenerate: boolean;
};

type SalesDocumentWarmupTrigger = (
	taskId: "warm-sales-document-snapshot",
	payload: SalesDocumentWarmupPayload,
) => Promise<unknown>;

const triggerSalesDocumentWarmup: SalesDocumentWarmupTrigger = (
	taskId,
	payload,
) => tasks.trigger(taskId, payload);

export async function queueSalesDocumentSnapshotWarmup(
	input: QueueSalesDocumentSnapshotWarmupInput,
	triggerTask: SalesDocumentWarmupTrigger = triggerSalesDocumentWarmup,
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

	return triggerTask("warm-sales-document-snapshot", {
		salesOrderId: input.salesOrderId,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId ?? "template-2",
		forceRegenerate: input.forceRegenerate ?? false,
	});
}

export async function queueSalesDocumentSnapshotWarmups(
	inputs: QueueSalesDocumentSnapshotWarmupInput[],
	triggerTask: SalesDocumentWarmupTrigger = triggerSalesDocumentWarmup,
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
		uniqueInputs.map((input) =>
			queueSalesDocumentSnapshotWarmup(input, triggerTask),
		),
	);
}
