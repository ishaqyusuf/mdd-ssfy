"use client";

import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { _trpc } from "./static-trpc";

interface PrintSalesV2Props {
	token?: string;
	preview?: boolean;
	templateId?: string;
	className?: string;
}

export function PrintSalesV2({
	token,
	preview,
	templateId,
	className,
}: PrintSalesV2Props = {}) {
	const { filters } = useSalesPrintFilter();
	const resolvedToken = token ?? filters.token ?? "";
	const resolvedPreview = preview ?? filters.preview ?? false;
	const { data } = useSuspenseQuery(
		_trpc.print.salesV2.queryOptions({
			token: resolvedToken,
			preview: resolvedPreview,
			templateId,
		}),
	);
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);

	useEffect(() => {
		if (resolvedPreview) return;
		setTimeout(() => {
			viewerRef.current?.contentWindow?.print();
		}, 3000);
	}, [resolvedPreview]);

	if (!data) return null;

	const packingSlipPage =
		data.pages.find((page) => page.config.mode === "packing-slip") || null;

	return (
		<>
			<PDFViewer
				ref={viewerRef}
				className={cn("flex h-screen w-full flex-col", className)}
			>
				<SalesPdfDocument
					pages={data.pages}
					templateId={data.templateId}
					title={data.title}
					companyAddress={data.companyAddress}
					watermark={data.watermark ?? undefined}
					baseUrl={getBaseUrl()}
				/>
			</PDFViewer>
			<PackingSlipSignFab
				page={packingSlipPage}
				token={resolvedToken}
				preview={resolvedPreview}
				templateId={templateId}
			/>
		</>
	);
}
