export function createSalesEmailContinuation<T>() {
	let pending: T | null = null;

	return {
		queue(intent: T) {
			pending = intent;
		},
		cancel() {
			pending = null;
		},
		consume() {
			const intent = pending;
			pending = null;
			return intent;
		},
		hasPending() {
			return pending !== null;
		},
	};
}
