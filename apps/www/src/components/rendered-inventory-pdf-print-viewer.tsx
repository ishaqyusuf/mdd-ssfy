"use client";

import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { printLoadedFrame } from "@/modules/sales-print/application/print-frame";
import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import type { SyntheticEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { PrintUnavailable } from "./print-sales-v2";

export interface RenderedInventoryPdfPrintViewerProps {
	ids: number[];
	mode: string;
	preview: boolean;
	templateId: string;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
}

export function RenderedInventoryPdfPrintViewer({
	ids,
	mode,
	preview,
	templateId,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: RenderedInventoryPdfPrintViewerProps) {
	const trpc = useTRPC();
	const baseUrl = getBaseUrl();
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);
	const printedRef = useRef(false);

	onPrintStage?.("print-data-query-start", {
		mode: mode as SalesPrintStageDetails["mode"],
		salesIds: ids,
	});

	const { data } = useSuspenseQuery(
		trpc.print.salesInventoryV2.queryOptions(
			{
				ids,
				mode,
				templateId,
				preview,
			},
			{
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const printData = data as any;
	const Viewer = PDFViewer as any;

	useEffect(() => {
		onPrintStage?.("print-data-query-done", {
			href: printData?.previewUrl,
			salesIds: ids,
		});
	}, [ids, onPrintStage, printData?.previewUrl]);

	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			const href = iframe.src;
			onPrintStage?.("pdf-iframe-load", { href, salesIds: ids });
			if (preview || printedRef.current || !iframe.src.startsWith("blob:")) {
				return;
			}

			printedRef.current = true;
			await printLoadedFrame({
				iframe,
				href,
				onPrintReady,
				onPrintError,
				onPrintStage: (stage, details) => {
					if (stage === "pdf-iframe-load") return;
					onPrintStage?.(stage, details);
				},
			});
		},
		[ids, onPrintError, onPrintReady, onPrintStage, preview],
	);

	if (!printData) {
		return (
			<PrintUnavailable reason="The inventory print document did not return any data." />
		);
	}

	return (
		<Viewer
			ref={viewerRef as any}
			onLoad={handleViewerLoad}
			className={cn("flex h-screen w-full flex-col", className)}
		>
			<SalesPdfDocument
				pages={printData.pages}
				templateId={printData.templateId}
				title={printData.title}
				companyAddress={printData.companyAddress}
				watermark={printData.watermark ?? undefined}
				baseUrl={baseUrl}
				previewUrl={printData.previewUrl}
				qrCodeDataUrl={printData.qrCodeDataUrl}
			/>
		</Viewer>
	);
}
