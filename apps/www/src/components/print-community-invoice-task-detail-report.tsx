"use client";

import { useCommunityInvoicePrintFilter } from "@/hooks/use-community-invoice-print-filter";
import { useTRPC } from "@/trpc/client";
import { CommunityInvoiceTaskDetailPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintCommunityInvoiceTaskDetailReport() {
	const trpc = useTRPC();
	const { filters } = useCommunityInvoicePrintFilter();
	const { data } = useSuspenseQuery(
		trpc.print.communityInvoiceTaskDetailReport.queryOptions({
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
			<CommunityInvoiceTaskDetailPdfDocument data={printData} title={printData.title} />
		</PDFViewer>
	);
}
