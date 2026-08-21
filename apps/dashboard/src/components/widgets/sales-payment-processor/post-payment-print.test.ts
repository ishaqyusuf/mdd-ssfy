import { describe, expect, it } from "bun:test";
import {
	capturePendingPrintRequests,
	createPostPaymentPrintQueue,
	dispatchPendingPrintRequests,
	takePendingPrintRequests,
} from "./post-payment-print";
import { buildPrintRequests } from "./utils";

describe("post-payment print orchestration", () => {
	it("captures and dispatches a hidden invoice request exactly once", async () => {
		const requests = capturePendingPrintRequests(
			buildPrintRequests({
				salesIds: [42],
				shouldPrintInvoice: true,
			}),
		);
		const pendingRef = { current: requests };
		const first = takePendingPrintRequests(pendingRef);
		const second = takePendingPrintRequests(pendingRef);
		const calls: unknown[] = [];

		const result = await dispatchPendingPrintRequests(
			first,
			async (input, options) => {
				calls.push({ input, options });
			},
		);
		await dispatchPendingPrintRequests(second, async () => {
			throw new Error("A consumed request must not print twice.");
		});

		expect(calls).toEqual([
			{
				input: {
					mode: "invoice",
					openInNewTab: false,
					salesIds: [42],
				},
				options: {
					awaitReady: true,
					headless: true,
					showToast: false,
					throwOnError: true,
				},
			},
		]);
		expect(result.failures).toEqual([]);
		expect(pendingRef.current).toEqual([]);
	});

	it("preserves a packing-slip request after form state changes", async () => {
		const submittedSalesIds = [51];
		const requests = capturePendingPrintRequests(
			buildPrintRequests({
				salesIds: submittedSalesIds,
				shouldPrintPackingSlip: true,
			}),
		);
		submittedSalesIds.splice(0, submittedSalesIds.length, 999);
		let received: unknown = null;

		await dispatchPendingPrintRequests(requests, async (input) => {
			received = input;
		});

		expect(received).toEqual({
			mode: "packing-slip",
			openInNewTab: false,
			salesIds: [51],
		});
	});

	it("captures one combined invoice and packing-slip request without a window", () => {
		const requests = capturePendingPrintRequests(
			buildPrintRequests({
				salesIds: [61, 62],
				shouldPrintInvoice: true,
				shouldPrintPackingSlip: true,
			}),
		);

		expect(requests).toEqual([
			{
				mode: "invoice,packing-slip",
				salesIds: [61, 62],
			},
		]);
	});

	it("returns a print-only retry request after preparation failure", async () => {
		const error = new Error("Unable to prepare document.");
		const requests = capturePendingPrintRequests([
			{
				mode: "packing-slip",
				salesIds: [82],
			},
		]);

		const result = await dispatchPendingPrintRequests(requests, async () => {
			throw error;
		});

		expect(result.failures).toEqual([
			{
				error,
				request: {
					mode: "packing-slip",
					salesIds: [82],
				},
			},
		]);
	});

	it("retries printing without recapturing or redispatching a payment", async () => {
		const queue = createPostPaymentPrintQueue();
		const calls: unknown[] = [];
		queue.capture([{ mode: "invoice", salesIds: [91] }]);

		const first = await queue.complete(async (input) => {
			calls.push(input);
			throw new Error("Printer unavailable");
		});
		const retry = await queue.retry(async (input) => {
			calls.push(input);
		});
		const duplicate = await queue.complete(async () => {
			throw new Error("Consumed print request must not run twice");
		});

		expect(first.status).toBe("failed");
		expect(retry.status).toBe("printed");
		expect(duplicate.status).toBe("skipped");
		expect(calls).toEqual([
			{ mode: "invoice", openInNewTab: false, salesIds: [91] },
			{ mode: "invoice", openInNewTab: false, salesIds: [91] },
		]);
	});
});
