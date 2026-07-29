import { describe, expect, it } from "bun:test";
import {
	closePendingPrintRequests,
	dispatchPendingPrintRequests,
	reservePendingPrintRequests,
	takePendingPrintRequests,
} from "./post-payment-print";
import type { PendingPrintRequest } from "./types";
import { buildPrintRequests } from "./utils";

function createWindow() {
	let replacedHref: string | null = null;
	let closed = false;
	const windowRef = {
		get closed() {
			return closed;
		},
		close() {
			closed = true;
		},
		location: {
			replace(href: string) {
				replacedHref = href;
			},
		},
	} as unknown as Window;

	return {
		get replacedHref() {
			return replacedHref;
		},
		windowRef,
	};
}

describe("post-payment print orchestration", () => {
	it("reserves and dispatches an invoice request exactly once", async () => {
		const target = createWindow();
		let opened = 0;
		const requests = reservePendingPrintRequests(
			buildPrintRequests({
				salesIds: [42],
				shouldPrintInvoice: true,
			}),
			() => {
				opened += 1;
				return target.windowRef;
			},
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

		expect(opened).toBe(1);
		expect(calls).toEqual([
			{
				input: {
					mode: "invoice",
					salesIds: [42],
					targetWindow: target.windowRef,
				},
				options: {
					throwOnError: true,
				},
			},
		]);
		expect(result.failures).toEqual([]);
		expect(pendingRef.current).toEqual([]);
	});

	it("preserves a packing-slip request after the form state changes", async () => {
		const target = createWindow();
		const submittedSalesIds = [51];
		const requests = reservePendingPrintRequests(
			buildPrintRequests({
				salesIds: submittedSalesIds,
				shouldPrintPackingSlip: true,
			}),
			() => target.windowRef,
		);
		submittedSalesIds.splice(0, submittedSalesIds.length, 999);
		let received: unknown = null;

		await dispatchPendingPrintRequests(requests, async (input) => {
			received = input;
		});

		expect(received).toEqual({
			mode: "packing-slip",
			salesIds: [51],
			targetWindow: target.windowRef,
		});
	});

	it("reserves one tab for a combined invoice and packing slip", () => {
		const target = createWindow();
		let opened = 0;
		const requests = reservePendingPrintRequests(
			buildPrintRequests({
				salesIds: [61, 62],
				shouldPrintInvoice: true,
				shouldPrintPackingSlip: true,
			}),
			() => {
				opened += 1;
				return target.windowRef;
			},
		);

		expect(opened).toBe(1);
		expect(requests).toEqual([
			{
				mode: "invoice,packing-slip",
				salesIds: [61, 62],
				windowRef: target.windowRef,
			},
		]);
	});

	it("returns a recoverable blocked failure without dispatching", async () => {
		const requests = reservePendingPrintRequests(
			buildPrintRequests({
				salesIds: [71],
				shouldPrintInvoice: true,
			}),
			() => null,
		);
		let calls = 0;

		const result = await dispatchPendingPrintRequests(requests, async () => {
			calls += 1;
		});

		expect(calls).toBe(0);
		expect(result.failures).toEqual([
			{
				error: null,
				reason: "blocked",
				request: {
					mode: "invoice",
					salesIds: [71],
					windowRef: null,
				},
			},
		]);
	});

	it("closes reserved tabs on cancellation and preparation failure", async () => {
		const cancelledWindow = createWindow();
		const cancelledRequests: PendingPrintRequest[] = [
			{
				mode: "invoice",
				salesIds: [81],
				windowRef: cancelledWindow.windowRef,
			},
		];
		closePendingPrintRequests(cancelledRequests);

		const failedWindow = createWindow();
		const error = new Error("Unable to prepare document.");
		const result = await dispatchPendingPrintRequests(
			[
				{
					mode: "packing-slip",
					salesIds: [82],
					windowRef: failedWindow.windowRef,
				},
			],
			async () => {
				throw error;
			},
		);

		expect(cancelledWindow.windowRef.closed).toBe(true);
		expect(failedWindow.windowRef.closed).toBe(true);
		expect(result.failures).toEqual([
			{
				error,
				reason: "failed",
				request: {
					mode: "packing-slip",
					salesIds: [82],
					windowRef: failedWindow.windowRef,
				},
			},
		]);
	});
});
