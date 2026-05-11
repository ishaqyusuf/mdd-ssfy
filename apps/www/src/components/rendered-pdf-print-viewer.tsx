"use client";

import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { SyntheticEvent } from "react";
import { useCallback, useRef } from "react";
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
}

function waitForNextFrame() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

async function waitForPrintableFrame(iframe: HTMLIFrameElement) {
	await waitForNextFrame();

	try {
		const iframeDocument = iframe.contentDocument;
		if (iframeDocument?.fonts?.ready) {
			await iframeDocument.fonts.ready;
		}
	} catch {
		// Browser PDF viewers can hide their internals; iframe load is still the
		// reliable signal that the blob URL has been handed off to the viewer.
	}

	await waitForNextFrame();
}

export function RenderedPdfPrintViewer({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	className,
}: RenderedPdfPrintViewerProps) {
	const baseUrl = getBaseUrl();
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);
	const printedRef = useRef(false);
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
	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			if (preview || printedRef.current || !iframe.src.startsWith("blob:")) {
				return;
			}

			printedRef.current = true;
			await waitForPrintableFrame(iframe);
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
		},
		[preview],
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
