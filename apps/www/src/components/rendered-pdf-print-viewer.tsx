"use client";

import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { printLoadedFrame } from "@/modules/sales-print/application/print-frame";
import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "@/modules/sales-print/application/sales-print-service";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import type { SyntheticEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { PrintUnavailable } from "./print-sales-v2";
import { _trpc } from "./static-trpc";

export interface RenderedPdfPrintViewerProps {
	pt: string;
	token: string;
	accessToken: string;
	snapshotId: string;
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

export function RenderedPdfPrintViewer({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: RenderedPdfPrintViewerProps) {
	const baseUrl = getBaseUrl();
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);
	const printedRef = useRef(false);
	onPrintStage?.("print-data-query-start");
	const { data } = useSuspenseQuery(
		_trpc.print.salesV2.queryOptions({
			pt: pt || undefined,
			token: token || undefined,
			accessToken: accessToken || undefined,
			snapshotId: snapshotId || undefined,
			preview,
			templateId,
			baseUrl,
		}),
	);
	useEffect(() => {
		onPrintStage?.("print-data-query-done", {
			href: data?.previewUrl,
		});
	}, [data?.previewUrl, onPrintStage]);
	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			const href = iframe.src;
			onPrintStage?.("pdf-iframe-load", { href });
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
		[onPrintError, onPrintReady, onPrintStage, preview],
	);

	if (!data) {
		return (
			<PrintUnavailable reason="The print document did not return any data." />
		);
	}

	const packingSlipPage =
		data.pages.find((page) => page.config.mode === "packing-slip") || null;

	return (
		<>
			<PDFViewer
				ref={viewerRef}
				onLoad={handleViewerLoad}
				className={cn("flex h-screen w-full flex-col", className)}
			>
				<SalesPdfDocument
					pages={data.pages}
					templateId={data.templateId}
					title={data.title}
					companyAddress={data.companyAddress}
					watermark={data.watermark ?? undefined}
					baseUrl={baseUrl}
					previewUrl={data.previewUrl}
					qrCodeDataUrl={data.qrCodeDataUrl}
				/>
			</PDFViewer>
			<PackingSlipSignFab
				page={packingSlipPage}
				pt={pt}
				token={token}
				accessToken={accessToken}
				snapshotId={snapshotId}
				preview={preview}
				templateId={templateId}
			/>
		</>
	);
}
