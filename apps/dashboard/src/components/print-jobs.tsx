"use client";

import { useJobsPrintFilter } from "@/hooks/use-jobs-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { useTRPC } from "@/trpc/client";
import { JobsPdfDocument, PDFViewer } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintJobs() {
	const trpc = useTRPC();
	const { filters } = useJobsPrintFilter();
	const { data } = useSuspenseQuery(
		trpc.print.jobs.queryOptions({
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
			<JobsPdfDocument data={printData} title={printData.title} baseUrl={getBaseUrl()} />
		</PDFViewer>
	);
}
