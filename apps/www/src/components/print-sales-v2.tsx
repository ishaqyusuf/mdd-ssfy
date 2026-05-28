"use client";

import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { cn } from "@/lib/utils";
import { printLoadedFrame } from "@/modules/sales-print/application/print-frame";
import {
	type SalesPrintRequestInfo,
	parseSalesPrintRequest,
} from "@/modules/sales-print/application/sales-print-request";
import {
	type SalesPrintStage,
	type SalesPrintStageDetails,
	buildSalesPdfDownloadUrlFromQuery,
} from "@/modules/sales-print/application/sales-print-service";
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
	pricingMode?: "customer" | "internal" | null;
	className?: string;
	printRequest?: SalesPrintRequestInfo;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
}

export function PrintSalesV2({
	pt,
	token,
	accessToken,
	snapshotId,
	preview,
	templateId,
	mode,
	pricingMode,
	className,
	printRequest,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: PrintSalesV2Props = {}) {
	if (printRequest) {
		return (
			<PrintSalesV2Resolved
				printRequest={printRequest}
				className={className}
				onPrintReady={onPrintReady}
				onPrintError={onPrintError}
				onPrintStage={onPrintStage}
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
			pricingMode={pricingMode}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
			onPrintStage={onPrintStage}
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
	pricingMode,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
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
		pricingMode,
	});

	return (
		<PrintSalesV2Resolved
			printRequest={resolvedPrintRequest}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
			onPrintStage={onPrintStage}
		/>
	);
}

function PrintSalesV2Resolved({
	printRequest,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: {
	printRequest: SalesPrintRequestInfo;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
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
				onPrintStage={onPrintStage}
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
			pricingMode={params.pricingMode}
			className={className}
			onPrintReady={onPrintReady}
			onPrintError={onPrintError}
			onPrintStage={onPrintStage}
		/>
	);
}

function StoredPdfPrintUrlFrame({
	accessToken,
	templateId,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: {
	accessToken: string;
	templateId: string;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
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
			onPrintStage={onPrintStage}
		/>
	);
}

function StoredPdfPrintFrame({
	src,
	className,
	onPrintReady,
	onPrintError,
	onPrintStage,
}: {
	src: string;
	className?: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
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
			onPrintStage?.("print-timeout", {
				href: src,
				message: "The PDF is taking longer than expected to load.",
			});
			onPrintError?.(
				new Error("The PDF is taking longer than expected to load."),
			);
		}, 12_000);

		return () => {
			if (loadTimeoutRef.current) {
				window.clearTimeout(loadTimeoutRef.current);
			}
		};
	}, [onPrintError, onPrintStage, src]);
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
			await printLoadedFrame({
				iframe,
				href: src,
				onPrintReady,
				onPrintError,
				onPrintStage,
			});
		},
		[onPrintError, onPrintReady, onPrintStage, src],
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
					onPrintStage?.("print-data-query-error", {
						href: src,
						message: "The PDF could not be loaded automatically.",
					});
					onPrintError?.(
						new Error("The PDF could not be loaded automatically."),
					);
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
