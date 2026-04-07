"use client";

import { _trpc } from "@/components/static-trpc";
import { useJobsPrintFilter } from "@/hooks/use-jobs-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { PDFViewer, JobsPdfDocument } from "@gnd/pdf";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function PrintJobs() {
	const { filters } = useJobsPrintFilter();
	const { data } = useSuspenseQuery(
		_trpc.print.jobs.queryOptions({
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
	}, [data, filters.preview]);

	if (!data) return null;

	return (
		<PDFViewer
			ref={viewerRef}
			className="flex h-screen w-full flex-col"
		>
			<JobsPdfDocument
				data={data}
				title={data.title}
				baseUrl={getBaseUrl()}
			/>
		</PDFViewer>
	);
}
