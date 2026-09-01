import type { SalesDocumentReadinessPreflight } from "@gnd/sales/document-readiness";
import { create } from "zustand";

type Continuation = (() => void | Promise<void>) | null;

type SalesDocumentReadinessState = {
	readiness: SalesDocumentReadinessPreflight | null;
	continuation: Continuation;
	open: (
		readiness: SalesDocumentReadinessPreflight,
		continuation?: Continuation,
	) => void;
	close: () => void;
};

export const useSalesDocumentReadinessStore =
	create<SalesDocumentReadinessState>((set) => ({
		readiness: null,
		continuation: null,
		open: (readiness, continuation = null) =>
			set({ readiness, continuation }),
		close: () => set({ readiness: null, continuation: null }),
	}));

export function openSalesDocumentReadiness(
	readiness: SalesDocumentReadinessPreflight,
	continuation?: Continuation,
) {
	useSalesDocumentReadinessStore.getState().open(readiness, continuation);
}

