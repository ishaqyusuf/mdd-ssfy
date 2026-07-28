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
import { type SalesPageBreakMode, SalesPdfDocument } from "@gnd/pdf/sales-v2";
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import type { SalesPrintSettings } from "@gnd/settings";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import type { ComponentType, ReactNode, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { PrintUnavailable } from "./print-sales-v2";

type SalesPrintData = {
	pages: PrintPage[];
	templateId: string;
	title: string;
	companyAddress: CompanyAddress;
	logoUrl?: string | null;
	watermark?: string | null;
	previewUrl?: string | null;
	qrCodeDataUrl?: string | null;
	printConfig: SalesPrintSettings;
};

type PdfViewerComponentProps = {
	children: ReactNode;
	className?: string;
	onLoad?: (event: SyntheticEvent<HTMLIFrameElement>) => void;
};

const PdfViewer =
	PDFViewer as unknown as ComponentType<PdfViewerComponentProps>;

export interface RenderedPdfPrintViewerProps {
	pt: string;
	token: string;
	accessToken: string;
	snapshotId: string;
	preview: boolean;
	templateId: string;
	pageBreakMode: SalesPageBreakMode;
	showImages: boolean;
	headlineFirstPage: boolean;
	pricingMode?: "customer" | "internal" | null;
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
	pageBreakMode,
	showImages,
	headlineFirstPage,
	pricingMode,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: RenderedPdfPrintViewerProps) {
	const trpc = useTRPC();
	const baseUrl = getBaseUrl();
	const printedRef = useRef(false);
	onPrintStage?.("print-data-query-start");
	const { data } = useSuspenseQuery(
		trpc.print.salesV2.queryOptions({
			pt: pt || undefined,
			token: token || undefined,
			accessToken: accessToken || undefined,
			snapshotId: snapshotId || undefined,
			preview,
			templateId,
			pageBreakMode,
			showImages,
			headlineFirstPage,
			pricingMode: pricingMode ?? undefined,
			baseUrl,
		}),
	);
	const printData = data as SalesPrintData | null;
	useEffect(() => {
		onPrintStage?.("print-data-query-done", {
			href: printData?.previewUrl,
		});
	}, [printData?.previewUrl, onPrintStage]);
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

	if (!printData) {
		return (
			<PrintUnavailable reason="The print document did not return any data." />
		);
	}

	const packingSlipPage =
		printData.pages.find((page) => page.config.mode === "packing-slip") || null;

	return (
		<>
			<PdfViewer
				onLoad={handleViewerLoad}
				className={cn("flex h-screen w-full flex-col", className)}
			>
				<SalesPdfDocument
					pages={printData.pages}
					templateId={printData.templateId}
					title={printData.title}
					companyAddress={printData.companyAddress}
					logoUrl={printData.logoUrl ?? undefined}
					watermark={printData.watermark ?? undefined}
					baseUrl={baseUrl}
					previewUrl={printData.previewUrl}
					qrCodeDataUrl={printData.qrCodeDataUrl}
					config={
						printData.printConfig || {
							pageBreakMode,
							showImages,
							headlineFirstPage,
						}
					}
				/>
			</PdfViewer>
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
