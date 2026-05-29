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
const PRINT_SUCCESS_TOAST_DURATION = 10000;

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

function getTerminalStageDuration(
	stage: SalesPrintStage,
	details?: SalesPrintStageDetails,
) {
	if (stage === "print-dialog-called") {
		return PRINT_SUCCESS_TOAST_DURATION;
	}
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
			if (!activeToast) return null;
			const timer = setTimeout(() => {
				activeToast.dismiss();
				dismissTimersRef.current.delete(timer);
			}, delayMs);
			dismissTimersRef.current.add(timer);
			return timer;
		},
		[],
	);

	const createPrintLifecycle = useCallback(
		(input: {
			mode: PrintMode;
			salesIds: number[];
			dispatchId?: number | null;
			templateId?: string | null;
			baseUrl?: string | null;
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
			let printedFromSnapshot = false;
			let activeDismissTimer: ReturnType<typeof setTimeout> | null = null;

			const updateToast = (
				update: ToastUpdateInput,
				dismissAfterMs?: number | null,
			) => {
				if (activeDismissTimer) {
					clearTimeout(activeDismissTimer);
					dismissTimersRef.current.delete(activeDismissTimer);
					activeDismissTimer = null;
				}
				activeToast?.update(update);
				if (dismissAfterMs != null) {
					activeDismissTimer =
						dismissToastAfter(activeToast, dismissAfterMs) ?? null;
				}
			};

			const recreateSnapshot = async () => {
				if (isRegeneratingRef.current) return;
				isRegeneratingRef.current = true;
				setIsRegenerating(true);
				updateToast({
					title: "Re-creating snapshot...",
					description: "Generating a fresh PDF snapshot for this document.",
					variant: "spinner",
					duration: Number.POSITIVE_INFINITY,
					action: undefined,
					footer: undefined,
				} as ToastUpdateInput);

				try {
					await regenerateSalesPrintDocument({
						salesIds: input.salesIds,
						mode: input.mode,
						dispatchId: input.dispatchId ?? null,
						templateId: input.templateId ?? null,
						baseUrl: input.baseUrl ?? null,
					});
					updateToast(
						{
							title: "Snapshot re-created",
							description: "Print again to use the fresh PDF snapshot.",
							variant: "success",
							duration: 3500,
						} as ToastUpdateInput,
						3500,
					);
				} catch (error) {
					updateToast(
						{
							title: "Unable to re-create snapshot",
							description: buildErrorDescription(error, "Please try again."),
							variant: "error",
							duration: 8000,
						} as ToastUpdateInput,
						8000,
					);
				} finally {
					isRegeneratingRef.current = false;
					setIsRegenerating(false);
				}
			};

			const getSnapshotAction = () =>
				printedFromSnapshot ? (
					<ToastAction
						altText="Re-create snapshot"
						onClick={() => {
							void recreateSnapshot();
						}}
					>
						Re-create snapshot
					</ToastAction>
				) : undefined;

			const reprint = async () => {
				if (isPrintingRef.current) return;
				isPrintingRef.current = true;
				setIsPrinting(true);
				updateToast({
					title: "Re-printing...",
					description: "Sending the same document back to the print viewer.",
					variant: "spinner",
					duration: Number.POSITIVE_INFINITY,
					action: undefined,
					footer: undefined,
				} as ToastUpdateInput);

				try {
					await openSalesPrintDocument({
						salesIds: input.salesIds,
						mode: input.mode,
						dispatchId: input.dispatchId ?? null,
						templateId: input.templateId ?? null,
						baseUrl: input.baseUrl ?? null,
						openInNewTab: false,
						onPrintStage,
						onPrintReady,
						onPrintError,
					} satisfies SalesPrintRequest);
				} catch (error) {
					onAccessError(error);
				} finally {
					isPrintingRef.current = false;
					setIsPrinting(false);
				}
			};

			const getReprintAction = () => (
				<ToastAction
					altText="Re-print"
					onClick={() => {
						void reprint();
					}}
				>
					Re-print
				</ToastAction>
			);

			const onPrintStage = (
				stage: SalesPrintStage,
				details?: SalesPrintStageDetails,
			) => {
				if (details?.href) {
					latestPrintHref = details.href;
				}
				if (details?.printedFromSnapshot) {
					printedFromSnapshot = true;
				}
				console.info("[sales-print]", stage, {
					mode: input.mode,
					salesIds: input.salesIds,
					...details,
				});

				if (!activeToast) return;

				const toastContent = getSalesPrintStageToast(stage, details);
				const terminalDuration = getTerminalStageDuration(stage, details);
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
							stage === "print-dialog-called" ? (
								getReprintAction()
							) : isErrorStage(stage) && latestPrintHref ? (
								<ToastAction
									altText="Open print view"
									onClick={() => {
										if (latestPrintHref) openLink(latestPrintHref, null, true);
									}}
								>
									Open
								</ToastAction>
							) : undefined,
						footer:
							stage === "print-dialog-called" && printedFromSnapshot
								? getSnapshotAction()
								: undefined,
					} as ToastUpdateInput,
					terminalDuration,
				);
			};

			const onPrintReady = () => {
				if (printedFromSnapshot) {
					updateToast(
						{
							title: "Printed from snapshot",
							description:
								"The print dialog opened from the stored PDF snapshot.",
							variant: "success",
							duration: PRINT_SUCCESS_TOAST_DURATION,
							action: getReprintAction(),
							footer: getSnapshotAction(),
						} as ToastUpdateInput,
						PRINT_SUCCESS_TOAST_DURATION,
					);
					return;
				}

				updateToast(
					{
						title: "Print dialog opened",
						description: "Choose a printer to finish printing.",
						variant: "success",
						duration: PRINT_SUCCESS_TOAST_DURATION,
						action: getReprintAction(),
						footer: undefined,
					} as ToastUpdateInput,
					PRINT_SUCCESS_TOAST_DURATION,
				);
			};

			const onPrintError = (error: unknown) => {
				updateToast(
					{
						title: "Unable to open print dialog",
						description: buildErrorDescription(error, "Please try again."),
						variant: "error",
						duration: 8000,
						footer: undefined,
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
						action: undefined,
						footer: undefined,
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
				dispatchId: input.dispatchId ?? null,
				templateId: input.templateId ?? null,
				baseUrl: input.baseUrl ?? null,
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
