"use client";

import { useContractorAccountingPrintFilter } from "@/hooks/use-contractor-accounting-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { useTRPC } from "@/trpc/client";
import { ContractorAccountingPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintContractorAccounting() {
	const trpc = useTRPC();
	const { filters } = useContractorAccountingPrintFilter();
	const { data } = useSuspenseQuery(
		trpc.print.contractorAccounting.queryOptions({
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
		<PDFViewer
			ref={viewerRef as never}
			className="flex h-screen w-full flex-col"
		>
			<ContractorAccountingPdfDocument report={data} baseUrl={getBaseUrl()} />
		</PDFViewer>
	);
}
