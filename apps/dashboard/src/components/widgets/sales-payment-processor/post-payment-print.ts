import { reserveSalesPrintWindow } from "@/modules/sales-print/application/sales-print-service";
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
	reason: "blocked" | "failed";
	request: PendingPrintRequest;
};

export function reservePendingPrintRequests(
	requests: PendingPrintRequest[],
	openWindow: () => Window | null = reserveSalesPrintWindow,
) {
	return requests.map((request) => ({
		...request,
		salesIds: [...request.salesIds],
		windowRef: openWindow(),
	}));
}

export function takePendingPrintRequests(ref: PendingPrintRequestRef) {
	const requests = ref.current;
	ref.current = [];
	return requests;
}

export function closePendingPrintRequests(requests: PendingPrintRequest[]) {
	for (const request of requests) {
		if (request.windowRef && !request.windowRef.closed) {
			request.windowRef.close();
		}
	}
}

export async function dispatchPendingPrintRequests(
	requests: PendingPrintRequest[],
	printSalesDocument: SalesPrintExecutor,
) {
	const failures: PendingPrintFailure[] = [];

	for (const request of requests) {
		if (!request.salesIds.length) {
			request.windowRef?.close();
			continue;
		}

		if (!request.windowRef || request.windowRef.closed) {
			failures.push({
				error: null,
				reason: "blocked",
				request,
			});
			continue;
		}

		try {
			await printSalesDocument(
				{
					salesIds: request.salesIds,
					mode: request.mode,
					targetWindow: request.windowRef,
				},
				{
					throwOnError: true,
				},
			);
		} catch (error) {
			if (!request.windowRef.closed) {
				request.windowRef.close();
			}
			failures.push({
				error,
				reason: "failed",
				request,
			});
		}
	}

	return { failures };
}
