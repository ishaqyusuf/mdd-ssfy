"use client";

import { _trpc } from "@/components/static-trpc";
import { useContractorPayoutPrintFilter } from "@/hooks/use-contractor-payout-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { ContractorPayoutPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintContractorPayouts() {
	const { filters } = useContractorPayoutPrintFilter();
	const { data } = useSuspenseQuery(
		_trpc.print.contractorPayouts.queryOptions({
			token: filters.token ?? "",
			preview: filters.preview ?? false,
		}),
	);
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);

	useEffect(() => {
		if (filters.preview) return;
		const timer = window.setTimeout(() => {
			viewerRef.current?.contentWindow?.print();
		}, 3000);
		return () => window.clearTimeout(timer);
	}, [filters.preview]);

	if (!data) return null;

	return (
		<PDFViewer ref={viewerRef} className="flex h-screen w-full flex-col">
			<ContractorPayoutPdfDocument
				data={data}
				title={data.title}
				baseUrl={getBaseUrl()}
			/>
		</PDFViewer>
	);
}
