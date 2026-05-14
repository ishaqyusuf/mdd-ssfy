"use client";

import { openLink } from "@/lib/open-link";
import type { PrintMode } from "@gnd/sales/print/types";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type SalesPrintRequest,
	type SalesPrintRequestMode,
	type SalesPrintStage,
	type SalesPrintStageDetails,
	downloadSalesPrintDocument,
	openSalesPrintDocument,
	regenerateSalesPrintDocument,
	resolveSalesPrintMode,
} from "./sales-print-service";
import { getSalesPrintStageToast } from "./sales-print-stage";

type ToastUpdateInput = Parameters<ReturnType<typeof toast>["update"]>[0];
type SalesPrintRegenerateResult = Awaited<
	ReturnType<typeof regenerateSalesPrintDocument>
>;

export type SalesPrintControllerActionInput = {
	salesIds: number[];
	mode?: SalesPrintRequestMode;
	dispatchId?: number | null;
	templateId?: string | null;
	baseUrl?: string | null;
	forceRegenerate?: boolean;
	openInNewTab?: boolean;
	salesType?: "order" | "quote";
};

export type SalesPrintControllerOptions = {
	showToast?: boolean;
	onRegenerated?: (access: SalesPrintRegenerateResult) => void | Promise<void>;
};

function getTerminalStageDuration(stage: SalesPrintStage) {
	if (stage === "print-dialog-called") return 2500;
	if (
		stage === "resolve-access-error" ||
		stage === "print-data-query-error" ||
		stage === "print-timeout"
	) {
		return 8000;
	}
	return null;
}

function isErrorStage(stage: SalesPrintStage) {
	return (
		stage === "resolve-access-error" ||
		stage === "print-data-query-error" ||
		stage === "print-timeout"
	);
}

function buildErrorDescription(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

export function useSalesPrintController() {
	const [isPrinting, setIsPrinting] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const isPrintingRef = useRef(false);
	const isDownloadingRef = useRef(false);
	const isRegeneratingRef = useRef(false);
	const dismissTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(
		new Set(),
	);

	useEffect(() => {
		return () => {
			for (const timer of dismissTimersRef.current) {
				clearTimeout(timer);
			}
			dismissTimersRef.current.clear();
		};
	}, []);

	const dismissToastAfter = useCallback(
		(activeToast: ReturnType<typeof toast> | null, delayMs: number) => {
			if (!activeToast) return;
			const timer = setTimeout(() => {
				activeToast.dismiss();
				dismissTimersRef.current.delete(timer);
			}, delayMs);
			dismissTimersRef.current.add(timer);
		},
		[],
	);

	const createPrintLifecycle = useCallback(
		(input: {
			mode: PrintMode;
			salesIds: number[];
			showToast: boolean;
		}) => {
			const activeToast = input.showToast
				? toast({
						title: "Preparing print...",
						description: "Requesting access for the selected document.",
						variant: "spinner",
						duration: Number.POSITIVE_INFINITY,
					})
				: null;
			let latestPrintHref: string | null = null;

			const updateToast = (
				update: ToastUpdateInput,
				dismissAfterMs?: number | null,
			) => {
				activeToast?.update(update);
				if (dismissAfterMs != null) {
					dismissToastAfter(activeToast, dismissAfterMs);
				}
			};

			const onPrintStage = (
				stage: SalesPrintStage,
				details?: SalesPrintStageDetails,
			) => {
				if (details?.href) {
					latestPrintHref = details.href;
				}
				console.info("[sales-print]", stage, {
					mode: input.mode,
					salesIds: input.salesIds,
					...details,
				});

				if (!activeToast) return;

				const toastContent = getSalesPrintStageToast(stage, details);
				const terminalDuration = getTerminalStageDuration(stage);
				updateToast(
					{
						...toastContent,
						variant: isErrorStage(stage)
							? "error"
							: stage === "print-dialog-called"
								? "success"
								: "spinner",
						duration: terminalDuration ?? Number.POSITIVE_INFINITY,
						action:
							isErrorStage(stage) && latestPrintHref ? (
								<ToastAction
									altText="Open print view"
									onClick={() => {
										if (latestPrintHref) openLink(latestPrintHref, null, true);
									}}
								>
									Open
								</ToastAction>
							) : undefined,
					} as ToastUpdateInput,
					terminalDuration,
				);
			};

			const onPrintReady = () => {
				updateToast(
					{
						title: "Print dialog opened",
						description: "Choose a printer to finish printing.",
						variant: "success",
						duration: 2500,
					} as ToastUpdateInput,
					2500,
				);
			};

			const onPrintError = (error: unknown) => {
				updateToast(
					{
						title: "Unable to open print dialog",
						description: buildErrorDescription(error, "Please try again."),
						variant: "error",
						duration: 8000,
						action: latestPrintHref ? (
							<ToastAction
								altText="Open print view"
								onClick={() => {
									if (latestPrintHref) openLink(latestPrintHref, null, true);
								}}
							>
								Open
							</ToastAction>
						) : undefined,
					} as ToastUpdateInput,
					8000,
				);
			};

			const onAccessError = (error: unknown) => {
				updateToast(
					{
						title: "Unable to prepare print",
						description: buildErrorDescription(error, "Please try again."),
						variant: "error",
						duration: 3500,
					} as ToastUpdateInput,
					3500,
				);
			};

			return {
				onPrintStage,
				onPrintReady,
				onPrintError,
				onAccessError,
			};
		},
		[dismissToastAfter],
	);

	const print = useCallback(
		async (
			input: SalesPrintControllerActionInput,
			options: SalesPrintControllerOptions = {},
		) => {
			if (!input.salesIds.length || isPrintingRef.current) return;
			isPrintingRef.current = true;
			setIsPrinting(true);
			const mode = resolveSalesPrintMode(input.mode, input.salesType);
			const lifecycle = createPrintLifecycle({
				mode,
				salesIds: input.salesIds,
				showToast: options.showToast ?? !input.openInNewTab,
			});

			try {
				await openSalesPrintDocument({
					salesIds: input.salesIds,
					mode,
					dispatchId: input.dispatchId ?? null,
					templateId: input.templateId ?? null,
					baseUrl: input.baseUrl ?? null,
					forceRegenerate: input.forceRegenerate ?? false,
					openInNewTab: input.openInNewTab,
					onPrintStage: lifecycle.onPrintStage,
					onPrintReady: lifecycle.onPrintReady,
					onPrintError: lifecycle.onPrintError,
				} satisfies SalesPrintRequest);
			} catch (error) {
				lifecycle.onAccessError(error);
			} finally {
				isPrintingRef.current = false;
				setIsPrinting(false);
			}
		},
		[createPrintLifecycle],
	);

	const downloadPdf = useCallback(
		async (input: SalesPrintControllerActionInput) => {
			if (!input.salesIds.length || isDownloadingRef.current) return;
			isDownloadingRef.current = true;
			setIsDownloading(true);
			const mode = resolveSalesPrintMode(input.mode, input.salesType);
			const downloadToast = toast({
				title: "Preparing PDF...",
				description: "Generating the latest sales document.",
				variant: "spinner",
				duration: Number.POSITIVE_INFINITY,
			});

			try {
				await downloadSalesPrintDocument({
					salesIds: input.salesIds,
					mode,
					dispatchId: input.dispatchId ?? null,
					templateId: input.templateId ?? null,
					baseUrl: input.baseUrl ?? null,
				});
				downloadToast.update({
					title: "PDF download started",
					description: "Check your browser downloads.",
					variant: "success",
					duration: 2500,
				} as ToastUpdateInput);
				dismissToastAfter(downloadToast, 2500);
			} catch (error) {
				downloadToast.update({
					title: "Unable to download PDF",
					description: buildErrorDescription(error, "Please try again."),
					variant: "error",
					duration: 3500,
				} as ToastUpdateInput);
				dismissToastAfter(downloadToast, 3500);
			} finally {
				isDownloadingRef.current = false;
				setIsDownloading(false);
			}
		},
		[dismissToastAfter],
	);

	const regenerate = useCallback(
		async (
			input: SalesPrintControllerActionInput,
			options: SalesPrintControllerOptions = {},
		) => {
			if (!input.salesIds.length || isRegeneratingRef.current) return null;
			isRegeneratingRef.current = true;
			setIsRegenerating(true);
			const mode = resolveSalesPrintMode(input.mode, input.salesType);
			const regenerateToast = toast({
				title: "Regenerating PDF...",
				description: "Generating the latest PDF snapshot.",
				variant: "spinner",
				duration: Number.POSITIVE_INFINITY,
			});

			try {
				const access = await regenerateSalesPrintDocument({
					salesIds: input.salesIds,
					mode,
					dispatchId: input.dispatchId ?? null,
					templateId: input.templateId ?? null,
					baseUrl: input.baseUrl ?? null,
				});
				await options.onRegenerated?.(access);
				regenerateToast.update({
					title: "Latest PDF snapshot generated",
					description: "The preview is ready to refresh.",
					variant: "success",
					duration: 2500,
				} as ToastUpdateInput);
				dismissToastAfter(regenerateToast, 2500);
				return access;
			} catch (error) {
				regenerateToast.update({
					title: "Unable to regenerate PDF",
					description: buildErrorDescription(error, "Please try again."),
					variant: "error",
					duration: 3500,
				} as ToastUpdateInput);
				dismissToastAfter(regenerateToast, 3500);
				return null;
			} finally {
				isRegeneratingRef.current = false;
				setIsRegenerating(false);
			}
		},
		[dismissToastAfter],
	);

	return {
		print,
		downloadPdf,
		regenerate,
		isPrinting,
		isDownloading,
		isRegenerating,
		printLabel: isPrinting ? "Preparing print" : "Print",
		downloadLabel: isDownloading ? "Preparing PDF" : "PDF",
		regenerateLabel: isRegenerating ? "Regenerating" : "Regenerate",
	};
}
