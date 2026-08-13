import { describe, expect, it } from "bun:test";

import { createSalesEmailContinuation } from "./sales-email-continuation";

describe("Sales email customer repair continuation", () => {
	it("consumes a pending send exactly once after customer repair", () => {
		const continuation = createSalesEmailContinuation<{
			withPayment: boolean;
		}>();
		continuation.queue({ withPayment: true });

		expect(continuation.hasPending()).toBe(true);
		expect(continuation.consume()).toEqual({ withPayment: true });
		expect(continuation.consume()).toBeNull();
		expect(continuation.hasPending()).toBe(false);
	});

	it("cancels without returning the pending send", () => {
		const continuation = createSalesEmailContinuation<string>();
		continuation.queue("send-invoice");
		continuation.cancel();

		expect(continuation.consume()).toBeNull();
	});
});
