"use client";

import { _trpc } from "@/components/static-trpc";
import { useCommunityInvoicePrintFilter } from "@/hooks/use-community-invoice-print-filter";
import { CommunityInvoiceTaskDetailPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintCommunityInvoiceTaskDetailReport() {
	const { filters } = useCommunityInvoicePrintFilter();
	const { data } = useSuspenseQuery(
		_trpc.print.communityInvoiceTaskDetailReport.queryOptions({
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
			<CommunityInvoiceTaskDetailPdfDocument data={data} title={data.title} />
		</PDFViewer>
	);
}
