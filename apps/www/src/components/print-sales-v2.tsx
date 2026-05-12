"use client";

import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { cn } from "@/lib/utils";
import {
	type SalesPrintRequestInfo,
	parseSalesPrintRequest,
} from "@/modules/sales-print/application/sales-print-request";
import { buildSalesPdfDownloadUrlFromQuery } from "@/modules/sales-print/application/sales-print-service";
import type { PrintMode } from "@gnd/sales/print/types";
import dynamic from "next/dynamic";
import type { SyntheticEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrintLoading } from "./print-loading";

const RenderedPdfPrintViewer = dynamic(
	() =>
		import("./rendered-pdf-print-viewer").then(
			(module) => module.RenderedPdfPrintViewer,
		),
	{
		loading: () => <PrintLoading />,
		ssr: false,
	},
);

interface PrintSalesV2Props {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	preview?: boolean;
	templateId?: string;
	mode?: PrintMode;
	className?: string;
	printRequest?: SalesPrintRequestInfo;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
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
	printRequest,
	onPrintReady,
	onPrintError,
}: PrintSalesV2Props = {}) {
	if (printRequest) {
		return (
			<PrintSalesV2Resolved
				printRequest={printRequest}
				className={className}
				onPrintReady={onPrintReady}
				onPrintError={onPrintError}
			/>
		);
	}

	return (
		<PrintSalesV2FromFilters
			pt={pt}
			token={token}
			accessToken={accessToken}
			snapshotId={snapshotId}
			preview={preview}
			templateId={templateId}
			mode={mode}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
		/>
	);
}

function PrintSalesV2FromFilters({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	mode,
	className,
	onPrintReady,
	onPrintError,
}: Omit<PrintSalesV2Props, "printRequest">) {
	const { filters } = useSalesPrintFilter();
	const resolvedPrintRequest = parseSalesPrintRequest({
		pt: pt ?? filters.pt,
		token: token ?? filters.token,
		accessToken: accessToken ?? filters.accessToken,
		snapshotId: snapshotId ?? filters.snapshotId,
		preview: preview ?? filters.preview,
		templateId: templateId ?? filters.templateId,
		mode: mode ?? filters.mode,
	});

	return (
		<PrintSalesV2Resolved
			printRequest={resolvedPrintRequest}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
		/>
	);
}

function PrintSalesV2Resolved({
	printRequest,
	className,
	onPrintReady,
	onPrintError,
}: {
	printRequest: SalesPrintRequestInfo;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
}) {
	const resolvedPrintRequest = printRequest;
	const { params } = resolvedPrintRequest;

	if (!resolvedPrintRequest.isValid) {
		return <PrintUnavailable reason={resolvedPrintRequest.invalidReason} />;
	}

	if (resolvedPrintRequest.renderMode === "stored-pdf") {
		return (
			<StoredPdfPrintUrlFrame
				accessToken={params.accessToken}
				templateId={params.templateId}
				className={className}
				onPrintReady={onPrintReady}
				onPrintError={onPrintError}
			/>
		);
	}

	return (
		<RenderedPdfPrintViewer
			pt={params.pt}
			token={params.token}
			accessToken={params.accessToken}
			snapshotId={params.snapshotId}
			preview={params.preview}
			templateId={params.templateId}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
		/>
	);
}

function StoredPdfPrintUrlFrame({
	accessToken,
	templateId,
	className,
	onPrintReady,
	onPrintError,
}: {
	accessToken: string;
	templateId: string;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
}) {
	const [browserOrigin, setBrowserOrigin] = useState<string | null>(null);
	useEffect(() => {
		setBrowserOrigin(window.location.origin);
	}, []);

	const fastPdfUrl = useMemo(() => {
		if (!browserOrigin) {
			return null;
		}

		return buildSalesPdfDownloadUrlFromQuery({
			accessToken,
			templateId,
			preview: true,
			origin: browserOrigin,
		});
	}, [accessToken, browserOrigin, templateId]);

	if (!fastPdfUrl) {
		return <PrintLoading />;
	}

	return (
		<StoredPdfPrintFrame
			src={fastPdfUrl}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
		/>
	);
}

function StoredPdfPrintFrame({
	src,
	className,
	onPrintReady,
	onPrintError,
}: {
	src: string;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
}) {
	const viewerRef = useRef<HTMLIFrameElement | null>(null);
	const printedRef = useRef(false);
	const loadTimeoutRef = useRef<number | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [loadTimedOut, setLoadTimedOut] = useState(false);
	useEffect(() => {
		setLoadFailed(false);
		setLoadTimedOut(false);
		printedRef.current = false;

		loadTimeoutRef.current = window.setTimeout(() => {
			setLoadTimedOut(true);
			onPrintError?.(new Error("The PDF is taking longer than expected to load."));
		}, 12_000);

		return () => {
			if (loadTimeoutRef.current) {
				window.clearTimeout(loadTimeoutRef.current);
			}
		};
	}, [onPrintError]);
	const handleViewerLoad = useCallback(
		async (event: SyntheticEvent<HTMLIFrameElement>) => {
			const iframe = event.currentTarget;
			if (loadTimeoutRef.current) {
				window.clearTimeout(loadTimeoutRef.current);
				loadTimeoutRef.current = null;
			}
			setLoadTimedOut(false);
			if (printedRef.current) {
				return;
			}

			printedRef.current = true;
			try {
				await waitForPrintableFrame(iframe);
				const printWindow = iframe.contentWindow;
				if (!printWindow) {
					throw new Error("The print frame is unavailable.");
				}
				printWindow.focus();
				printWindow.print();
				onPrintReady?.();
			} catch (error) {
				onPrintError?.(error);
			}
		},
		[onPrintError, onPrintReady],
	);

	return (
		<div className={cn("relative h-screen w-full", className)}>
			<iframe
				ref={viewerRef}
				src={src}
				onLoad={handleViewerLoad}
				onError={() => {
					if (loadTimeoutRef.current) {
						window.clearTimeout(loadTimeoutRef.current);
						loadTimeoutRef.current = null;
					}
					setLoadFailed(true);
					onPrintError?.(new Error("The PDF could not be loaded automatically."));
				}}
				className="flex h-full w-full flex-col border-0"
				title="Sales print PDF"
			/>
			{loadFailed || loadTimedOut ? (
				<PrintRecoveryPanel
					src={src}
					message={
						loadFailed
							? "The PDF could not be loaded automatically."
							: "The PDF is taking longer than expected to load."
					}
				/>
			) : null}
		</div>
	);
}

export function PrintUnavailable({ reason }: { reason?: string }) {
	const message =
		reason === "missing-locator"
			? "This print link is missing a document token."
			: reason === "multiple-locators"
				? "This print link has conflicting document tokens."
				: reason || "This print document is unavailable.";

	return (
		<div className="flex h-screen w-full items-center justify-center bg-white p-6 text-center">
			<div className="max-w-md space-y-3">
				<h1 className="font-semibold text-lg text-slate-950">
					Unable to load print document
				</h1>
				<p className="text-slate-600 text-sm">{message}</p>
			</div>
		</div>
	);
}

function PrintRecoveryPanel({
	src,
	message,
}: {
	src: string;
	message: string;
}) {
	return (
		<div className="absolute inset-x-4 top-4 z-10 mx-auto max-w-md rounded-md border border-slate-200 bg-white p-4 shadow-lg">
			<p className="font-medium text-slate-950 text-sm">
				Print preview needs attention
			</p>
			<p className="mt-1 text-slate-600 text-sm">{message}</p>
			<div className="mt-3 flex gap-2">
				<a
					href={src}
					target="_blank"
					rel="noreferrer"
					className="inline-flex h-9 items-center rounded-md bg-slate-950 px-3 font-medium text-sm text-white"
				>
					Open PDF
				</a>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 font-medium text-slate-950 text-sm"
				>
					Retry
				</button>
			</div>
		</div>
	);
}
