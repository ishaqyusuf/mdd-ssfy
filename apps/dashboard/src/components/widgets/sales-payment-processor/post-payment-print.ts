import type {
	SalesPrintControllerActionInput,
	SalesPrintControllerOptions,
} from "@/modules/sales-print/application/use-sales-print-controller";
import type { PendingPrintRequest } from "./types";

type PendingPrintRequestRef = {
	current: PendingPrintRequest[];
};

type SalesPrintExecutor = (
	input: SalesPrintControllerActionInput,
	options?: SalesPrintControllerOptions,
) => Promise<void>;

export type PendingPrintFailure = {
	error: unknown;
	request: PendingPrintRequest;
};

export type PostPaymentPrintOutcome =
	| { status: "skipped" | "printed"; failures: [] }
	| { status: "failed"; failures: PendingPrintFailure[] };

export function capturePendingPrintRequests(requests: PendingPrintRequest[]) {
	return requests.map((request) => ({
		...request,
		salesIds: [...request.salesIds],
	}));
}

export function takePendingPrintRequests(ref: PendingPrintRequestRef) {
	const requests = ref.current;
	ref.current = [];
	return requests;
}

export async function dispatchPendingPrintRequests(
	requests: PendingPrintRequest[],
	printSalesDocument: SalesPrintExecutor,
) {
	const failures: PendingPrintFailure[] = [];

	for (const request of requests) {
		if (!request.salesIds.length) continue;

		try {
			await printSalesDocument(
				{
					salesIds: request.salesIds,
					mode: request.mode,
					openInNewTab: false,
				},
				{
					awaitReady: true,
					headless: true,
					showToast: false,
					throwOnError: true,
				},
			);
		} catch (error) {
			failures.push({
				error,
				request,
			});
		}
	}

	return { failures };
}

export function createPostPaymentPrintQueue() {
	let pendingRequests: PendingPrintRequest[] = [];
	let failedRequests: PendingPrintRequest[] = [];

	return {
		capture(requests: PendingPrintRequest[]) {
			pendingRequests = capturePendingPrintRequests(requests);
			failedRequests = [];
		},
		clear() {
			pendingRequests = [];
			failedRequests = [];
		},
		hasPending() {
			return pendingRequests.length > 0;
		},
		getActiveMode() {
			return pendingRequests[0]?.mode || failedRequests[0]?.mode || null;
		},
		async complete(printSalesDocument: SalesPrintExecutor) {
			const requests = pendingRequests;
			pendingRequests = [];
			if (!requests.length) {
				return { status: "skipped", failures: [] } satisfies PostPaymentPrintOutcome;
			}

			const { failures } = await dispatchPendingPrintRequests(
				requests,
				printSalesDocument,
			);
			failedRequests = failures.map(({ request }) => request);
			return failures.length
				? ({ status: "failed", failures } satisfies PostPaymentPrintOutcome)
				: ({ status: "printed", failures: [] } satisfies PostPaymentPrintOutcome);
		},
		async retry(printSalesDocument: SalesPrintExecutor) {
			const requests = failedRequests;
			failedRequests = [];
			if (!requests.length) {
				return { status: "skipped", failures: [] } satisfies PostPaymentPrintOutcome;
			}

			const { failures } = await dispatchPendingPrintRequests(
				requests,
				printSalesDocument,
			);
			failedRequests = failures.map(({ request }) => request);
			return failures.length
				? ({ status: "failed", failures } satisfies PostPaymentPrintOutcome)
				: ({ status: "printed", failures: [] } satisfies PostPaymentPrintOutcome);
		},
	};
}
