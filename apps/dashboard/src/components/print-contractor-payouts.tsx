"use client";

import { useContractorPayoutPrintFilter } from "@/hooks/use-contractor-payout-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { useTRPC } from "@/trpc/client";
import { ContractorPayoutPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintContractorPayouts() {
	const trpc = useTRPC();
	const { filters } = useContractorPayoutPrintFilter();
	const { data } = useSuspenseQuery(
		trpc.print.contractorPayouts.queryOptions({
			token: filters.token ?? "",
			preview: filters.preview ?? false,
		}),
	);
	const printData = data as any;
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);

	useEffect(() => {
		if (filters.preview) return;
		const timer = window.setTimeout(() => {
			viewerRef.current?.contentWindow?.print();
		}, 3000);
		return () => window.clearTimeout(timer);
	}, [filters.preview]);

	if (!printData) return null;

	return (
		<PDFViewer ref={viewerRef as any} className="flex h-screen w-full flex-col">
			<ContractorPayoutPdfDocument
				data={printData}
				title={printData.title}
				baseUrl={getBaseUrl()}
			/>
		</PDFViewer>
	);
}
