"use client";

import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { SyntheticEvent } from "react";
import { useCallback, useRef } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { _trpc } from "./static-trpc";

interface PrintSalesV2Props {
	token?: string;
	accessToken?: string;
	preview?: boolean;
	templateId?: string;
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
	token,
	accessToken,
	preview,
	templateId,
	className,
}: PrintSalesV2Props = {}) {
	const { filters } = useSalesPrintFilter();
	const resolvedToken = token ?? filters.token ?? "";
	const resolvedAccessToken = accessToken ?? filters.accessToken ?? "";
	const resolvedPreview = preview ?? filters.preview ?? false;
	const resolvedTemplateId = templateId ?? filters.templateId ?? "template-2";
	const { data } = useSuspenseQuery(
		_trpc.print.salesV2.queryOptions({
			token: resolvedToken || undefined,
			accessToken: resolvedAccessToken || undefined,
			preview: resolvedPreview,
			templateId: resolvedTemplateId,
		}),
	);
	const viewerRef = useRef<{ contentWindow?: Window | null } | null>(null);
	const printedRef = useRef(false);

	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			if (
				resolvedPreview ||
				printedRef.current ||
				!iframe.src.startsWith("blob:")
			) {
				return;
			}

			printedRef.current = true;
			await waitForPrintableFrame(iframe);
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
		},
		[resolvedPreview],
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
					baseUrl={getBaseUrl()}
				/>
			</PDFViewer>
			<PackingSlipSignFab
				page={packingSlipPage}
				token={resolvedToken}
				accessToken={resolvedAccessToken}
				preview={resolvedPreview}
				templateId={resolvedTemplateId}
			/>
		</>
	);
}
