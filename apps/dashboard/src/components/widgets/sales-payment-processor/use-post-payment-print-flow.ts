"use client";

import type {
	SalesPrintControllerActionInput,
	SalesPrintControllerOptions,
} from "@/modules/sales-print/application/use-sales-print-controller";
import { useCallback, useRef, useState } from "react";
import { createPostPaymentPrintQueue } from "./post-payment-print";
import type { PendingPrintRequest } from "./types";

type SalesPrintExecutor = (
	input: SalesPrintControllerActionInput,
	options?: SalesPrintControllerOptions,
) => Promise<void>;

export function usePostPaymentPrintFlow(
	printSalesDocument: SalesPrintExecutor,
) {
	const queueRef = useRef(createPostPaymentPrintQueue());
	const [activePrintMode, setActivePrintMode] = useState<string | null>(null);

	const capture = useCallback((requests: PendingPrintRequest[]) => {
		queueRef.current.capture(requests);
		setActivePrintMode(queueRef.current.getActiveMode());
	}, []);

	const clear = useCallback(() => {
		queueRef.current.clear();
		setActivePrintMode(null);
	}, []);

	const complete = useCallback(
		() => queueRef.current.complete(printSalesDocument),
		[printSalesDocument],
	);

	const retry = useCallback(
		() => queueRef.current.retry(printSalesDocument),
		[printSalesDocument],
	);

	const hasPending = useCallback(() => queueRef.current.hasPending(), []);

	return {
		activePrintMode,
		capture,
		clear,
		complete,
		hasPending,
		retry,
	};
}
