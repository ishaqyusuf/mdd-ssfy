"use client";

import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { buildSalesPdfDownloadUrlFromQuery } from "@/modules/sales-print/application/sales-print-service";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import type { PrintMode } from "@gnd/sales/print/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { SyntheticEvent } from "react";
import { useCallback, useMemo, useRef } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { _trpc } from "./static-trpc";

interface PrintSalesV2Props {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	preview?: boolean;
	templateId?: string;
	mode?: PrintMode;
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

export function PrintSalesV2({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	mode,
	className,
}: PrintSalesV2Props = {}) {
	const { filters } = useSalesPrintFilter();
	const resolvedPt = pt ?? filters.pt ?? "";
	const resolvedToken = token ?? filters.token ?? "";
	const resolvedAccessToken = accessToken ?? filters.accessToken ?? "";
	const resolvedSnapshotId = snapshotId ?? filters.snapshotId ?? "";
	const resolvedPreview = preview ?? filters.preview ?? false;
	const resolvedTemplateId = templateId ?? filters.templateId ?? "template-2";
	const resolvedMode = mode ?? (filters.mode as PrintMode | undefined);
	const fastPdfUrl = useMemo(() => {
		if (
			resolvedPreview ||
			!resolvedAccessToken ||
			resolvedMode === "packing-slip" ||
			resolvedPt ||
			resolvedToken ||
			resolvedSnapshotId
		) {
			return null;
		}

		return buildSalesPdfDownloadUrlFromQuery({
			accessToken: resolvedAccessToken,
			templateId: resolvedTemplateId,
			preview: true,
			origin: window.location.origin,
		});
	}, [
		resolvedAccessToken,
		resolvedMode,
		resolvedPreview,
		resolvedPt,
		resolvedSnapshotId,
		resolvedTemplateId,
		resolvedToken,
	]);

	if (fastPdfUrl) {
		return (
			<StoredPdfPrintFrame src={fastPdfUrl} className={className} />
		);
	}

	return (
		<RenderedPdfPrintViewer
			pt={resolvedPt}
			token={resolvedToken}
			accessToken={resolvedAccessToken}
			snapshotId={resolvedSnapshotId}
			preview={resolvedPreview}
			templateId={resolvedTemplateId}
			className={className}
		/>
	);
}

function StoredPdfPrintFrame({
	src,
	className,
}: {
	src: string;
	className?: string;
}) {
	const viewerRef = useRef<HTMLIFrameElement | null>(null);
	const printedRef = useRef(false);
	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			if (printedRef.current) {
				return;
			}

			printedRef.current = true;
			await waitForPrintableFrame(iframe);
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
		},
		[],
	);

	return (
		<iframe
			ref={viewerRef}
			src={src}
			onLoad={handleViewerLoad}
			className={cn("flex h-screen w-full flex-col border-0", className)}
			title="Sales print PDF"
		/>
	);
}

function RenderedPdfPrintViewer({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	className,
}: Required<
	Pick<
		PrintSalesV2Props,
		| "pt"
		| "token"
		| "accessToken"
		| "snapshotId"
		| "preview"
		| "templateId"
		| "className"
	>
>) {
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

	if (!data) return null;

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
