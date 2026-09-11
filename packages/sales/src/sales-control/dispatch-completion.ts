import { createHash } from "node:crypto";
import type { UpdateSalesControl } from "../schema";

export function dispatchCompletionFingerprint(task: NonNullable<UpdateSalesControl["submitDispatch"]>) {
	return createHash("sha256").update(JSON.stringify({
		dispatchId: task.dispatchId ?? null,
		expectedFulfillmentRevision: task.expectedFulfillmentRevision ?? null,
		receivedBy: task.receivedBy ?? null,
		receivedDate: task.receivedDate?.toISOString() ?? null,
		note: task.note ?? null,
		noteType: task.noteType ?? null,
		signature: task.signature ?? null,
		attachments: (task.attachments ?? []).map((item) => item.pathname).sort(),
	})).digest("hex");
}

type DispatchCompletionAttempt = "continue" | "replay" | "conflict";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function resolveDispatchCompletionAttempt(input: {
	status: string | null | undefined;
	meta: unknown;
	requestId: string | null | undefined;
	fingerprint?: string;
}): DispatchCompletionAttempt {
	const requestId = input.requestId?.trim();
	if (input.status !== "completed") return "continue";
	if (!requestId) return "conflict";
	const completion = asRecord(asRecord(input.meta).dispatchCompletion);
	if (completion.fingerprint && completion.fingerprint !== input.fingerprint) return "conflict";
	return completion.requestId === requestId ? "replay" : "conflict";
}
