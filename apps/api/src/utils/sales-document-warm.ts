import type { PrintMode } from "@gnd/sales/print/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { isSalesPdfSnapshotArtifactsDisabled } from "./sales-document-snapshot-policy";

export type QueueSalesDocumentSnapshotWarmupInput = {
	snapshotId?: string;
	salesOrderId: number;
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	forceRegenerate?: boolean;
	idempotencyKey?: string;
	assistantRequest?: {
		userId: number;
		scopeType: "organization" | "user";
		scopeId: string;
		sourceRevision: string;
	};
};

type SalesDocumentWarmupPayload = {
	snapshotId?: string;
	salesOrderId: number;
	mode: PrintMode;
	dispatchId: number | null;
	templateId: string;
	forceRegenerate: boolean;
	assistantRequest?: {
		userId: number;
		scopeType: "organization" | "user";
		scopeId: string;
		sourceRevision: string;
	};
};

type SalesDocumentWarmupTrigger = (
	taskId: "warm-sales-document-snapshot",
	payload: SalesDocumentWarmupPayload,
	options?: { idempotencyKey?: string },
) => Promise<unknown>;

const triggerSalesDocumentWarmup: SalesDocumentWarmupTrigger = (
	taskId,
	payload,
	options,
) => tasks.trigger(taskId, payload, options);

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

	return triggerTask(
		"warm-sales-document-snapshot",
		{
			...(input.snapshotId ? { snapshotId: input.snapshotId } : {}),
			salesOrderId: input.salesOrderId,
			mode: input.mode,
			dispatchId: input.dispatchId ?? null,
			templateId: input.templateId ?? "template-2",
			forceRegenerate: input.forceRegenerate ?? false,
			...(input.assistantRequest
				? { assistantRequest: input.assistantRequest }
				: {}),
		},
		input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
	);
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
