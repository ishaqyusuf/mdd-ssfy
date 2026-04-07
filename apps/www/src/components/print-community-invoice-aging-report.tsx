"use client";

import { _trpc } from "@/components/static-trpc";
import { useCommunityInvoiceAgingPrintFilter } from "@/hooks/use-community-invoice-aging-print-filter";
import { CommunityInvoiceAgingPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintCommunityInvoiceAgingReport() {
	const { filters } = useCommunityInvoiceAgingPrintFilter();
	const { data } = useSuspenseQuery(
		_trpc.print.communityInvoiceAgingReport.queryOptions({
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
			<CommunityInvoiceAgingPdfDocument data={data} title={data.title} />
		</PDFViewer>
	);
}
