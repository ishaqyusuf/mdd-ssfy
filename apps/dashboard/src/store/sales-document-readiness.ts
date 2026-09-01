import type { SalesDocumentReadinessPreflight } from "@gnd/sales/document-readiness";
import { create } from "zustand";

type Continuation = (() => void | Promise<void>) | null;

type SalesDocumentReadinessState = {
	readiness: SalesDocumentReadinessPreflight | null;
	continuation: Continuation;
	cancellation: Continuation;
	open: (
		readiness: SalesDocumentReadinessPreflight,
		continuation?: Continuation,
		cancellation?: Continuation,
	) => void;
	close: () => void;
};

export const useSalesDocumentReadinessStore =
	create<SalesDocumentReadinessState>((set) => ({
		readiness: null,
		continuation: null,
		cancellation: null,
		open: (readiness, continuation = null, cancellation = null) =>
			set({ readiness, continuation, cancellation }),
		close: () =>
			set({ readiness: null, continuation: null, cancellation: null }),
	}));

export function openSalesDocumentReadiness(
	readiness: SalesDocumentReadinessPreflight,
	continuation?: Continuation,
	cancellation?: Continuation,
) {
	useSalesDocumentReadinessStore
		.getState()
		.open(readiness, continuation, cancellation);
}
