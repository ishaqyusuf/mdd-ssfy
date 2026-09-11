export type FulfillmentCompletionAttempt = {
	key: string;
	completionRequestId: string;
	receivedDate: Date;
};

type CompletionAttemptInput = { dispatchId: number; scopeRevision: number | null; actorId: number; mode: "packed_only" | "pack_all" };

function completionAttemptKey(input: CompletionAttemptInput) {
	return JSON.stringify([input.dispatchId, input.scopeRevision, input.actorId, input.mode]);
}

export function retainFulfillmentCompletionAttempt(
	previous: FulfillmentCompletionAttempt | null,
	input: CompletionAttemptInput,
	createId: () => string = () => crypto.randomUUID(),
	now = () => new Date(),
): FulfillmentCompletionAttempt {
	const key = completionAttemptKey(input);
	if (previous?.key === key) return previous;
	return { key, completionRequestId: createId(), receivedDate: now() };
}

export function restoreFulfillmentCompletionAttempt(
	storage: Pick<Storage, "getItem" | "setItem">,
	previous: FulfillmentCompletionAttempt | null,
	input: CompletionAttemptInput,
): FulfillmentCompletionAttempt {
	const key = completionAttemptKey(input);
	const storageKey = `gnd:fulfillment-completion:${key}`;
	let saved = previous;
	const raw = storage.getItem(storageKey);
	if (raw) {
		try {
			const value = JSON.parse(raw);
			if (value?.key === key && typeof value.completionRequestId === "string" &&
				value.completionRequestId.length >= 12 && value.completionRequestId.length <= 100 &&
				typeof value.receivedDate === "string" && Number.isFinite(new Date(value.receivedDate).getTime())) {
				saved = { key, completionRequestId: value.completionRequestId, receivedDate: new Date(value.receivedDate) };
			}
		} catch { /* Discard malformed local state and create a fresh attempt. */ }
	}
	const attempt = retainFulfillmentCompletionAttempt(saved, input);
	storage.setItem(storageKey, JSON.stringify(attempt));
	return attempt;
}
