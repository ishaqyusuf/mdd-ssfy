/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { SalesFormCapabilities, SalesFormPermissions } from "../contracts";

export type SalesFormFloatingActionsVisibilityInput = {
	isSaved?: boolean;
	canAddItem?: boolean;
	canSaveDraft?: boolean;
	hasPaymentAction?: boolean;
	hasSavedRecordAction?: boolean;
	enableSavedRecordActions?: boolean;
	hasOverviewAction?: boolean;
	hasPreviewAction?: boolean;
	hasPrintAction?: boolean;
	hasDownloadPdfAction?: boolean;
	capabilities?: Partial<SalesFormCapabilities>;
	permissions?: Partial<SalesFormPermissions>;
};

export type SalesFormFloatingActionsVisibility = {
	addItem: boolean;
	saveDraft: boolean;
	payment: boolean;
	savedRecord: boolean;
	overview: boolean;
	preview: boolean;
	print: boolean;
	downloadPdf: boolean;
	moreMenu: boolean;
};

export type SalesFormFloatingActionsProps = {
	isSaved?: boolean;
	isSaving?: boolean;
	isPreviewing?: boolean;
	isPrinting?: boolean;
	isDownloading?: boolean;
	capabilities?: Partial<SalesFormCapabilities>;
	permissions?: Partial<SalesFormPermissions>;
	onAddItem?: () => void;
	onSaveDraft?: () => Promise<void> | void;
	onSaveClose?: () => Promise<void> | void;
	onSaveNew?: () => Promise<void> | void;
	onOpenOverview?: () => void;
	onPreview?: () => Promise<void> | void;
	onPrint?: (event?: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
	onDownloadPdf?: () => Promise<void> | void;
	paymentAction?: ReactNode;
	paymentMenuAction?: ReactNode;
	enableSavedRecordActions?: boolean;
	savedRecordAction?: ReactNode;
	savedRecordMenuAction?: ReactNode;
};

export function resolveSalesFormFloatingActionsVisibility(
	input: SalesFormFloatingActionsVisibilityInput,
): SalesFormFloatingActionsVisibility {
	const isSaved = Boolean(input.isSaved);
	const canAddItem = Boolean(input.canAddItem);
	const canSaveDraft =
		input.permissions?.canSaveDraft === true && Boolean(input.canSaveDraft);
	const payment =
		isSaved &&
		input.capabilities?.payments === true &&
		input.permissions?.canTakePayment === true &&
		Boolean(input.hasPaymentAction);
	const savedRecord =
		isSaved &&
		Boolean(input.enableSavedRecordActions) &&
		Boolean(input.hasSavedRecordAction);
	const overview =
		isSaved &&
		input.capabilities?.internalOverview === true &&
		input.permissions?.canOpenInternalOverview === true &&
		Boolean(input.hasOverviewAction);
	const preview =
		input.capabilities?.printing === true &&
		input.permissions?.canPrint === true &&
		Boolean(input.hasPreviewAction);
	const print =
		isSaved &&
		input.capabilities?.printing === true &&
		input.permissions?.canPrint === true &&
		Boolean(input.hasPrintAction);
	const downloadPdf =
		isSaved &&
		input.capabilities?.printing === true &&
		input.permissions?.canPrint === true &&
		Boolean(input.hasDownloadPdfAction);

	return {
		addItem: canAddItem,
		saveDraft: canSaveDraft,
		payment,
		savedRecord,
		overview,
		preview,
		print,
		downloadPdf,
		moreMenu: payment || savedRecord || overview || preview || print || downloadPdf,
	};
}

function FloatingActionTooltip({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="top" className="px-2 py-1 text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

function FloatingSaveChoice({
	isSaving,
	onSaveDraft,
	onSaveClose,
	onSaveNew,
}: {
	isSaving?: boolean;
	onSaveDraft?: () => Promise<void> | void;
	onSaveClose?: () => Promise<void> | void;
	onSaveNew?: () => Promise<void> | void;
}) {
	const [optionsOpen, setOptionsOpen] = useState(false);
	const [countdown, setCountdown] = useState(3);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const clearTimers = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const runSave = (mode: "draft" | "close" | "new") => {
		clearTimers();
		setOptionsOpen(false);
		if (mode === "close") {
			void onSaveClose?.();
			return;
		}
		if (mode === "new") {
			void onSaveNew?.();
			return;
		}
		void onSaveDraft?.();
	};

	const cancelOptions = () => {
		clearTimers();
		setOptionsOpen(false);
	};

	const openOptions = () => {
		if (isSaving) return;
		clearTimers();
		setCountdown(3);
		setOptionsOpen(true);
		intervalRef.current = setInterval(() => {
			setCountdown((current) => Math.max(1, current - 1));
		}, 1000);
		timeoutRef.current = setTimeout(() => runSave("draft"), 3000);
	};

	useEffect(() => clearTimers, []);

	return (
		<div className="relative flex items-center">
			<div
				className={[
					"transition-all duration-200 ease-out",
					optionsOpen
						? "pointer-events-none w-0 scale-95 opacity-0"
						: "w-8 scale-100 opacity-100",
				].join(" ")}
			>
				<FloatingActionTooltip label={isSaving ? "Saving" : "Save"}>
					<Button
						type="button"
						size="icon"
						onClick={openOptions}
						disabled={isSaving}
						className="size-8 rounded-full p-0"
						aria-label={isSaving ? "Saving" : "Save"}
					>
						{isSaving ? (
							<Icons.Loader2 className="size-3.5 animate-spin" />
						) : (
							<Icons.Save className="size-3.5" />
						)}
					</Button>
				</FloatingActionTooltip>
			</div>
			<div
				className={[
					"flex items-center gap-1 overflow-hidden transition-all duration-200 ease-out",
					optionsOpen
						? "ml-1 max-w-[30rem] scale-100 opacity-100"
						: "pointer-events-none ml-0 max-w-0 scale-95 opacity-0",
				].join(" ")}
			>
				<Button
					type="button"
					size="sm"
					disabled={isSaving}
					className="h-8 rounded-full px-3 text-xs"
					onClick={() => runSave("draft")}
				>
					{isSaving ? "Saving..." : `Save (${countdown})`}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={isSaving || !onSaveClose}
					className="h-8 rounded-full px-3 text-xs"
					onClick={() => runSave("close")}
				>
					Save & Close
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={isSaving || !onSaveNew}
					className="h-8 rounded-full px-3 text-xs"
					onClick={() => runSave("new")}
				>
					Save & New
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					disabled={isSaving}
					className="h-8 rounded-full px-3 text-xs"
					onClick={cancelOptions}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}

export function SalesFormFloatingActions(props: SalesFormFloatingActionsProps) {
	const visibility = resolveSalesFormFloatingActionsVisibility({
		isSaved: props.isSaved,
		canAddItem: Boolean(props.onAddItem),
		canSaveDraft: Boolean(props.onSaveDraft),
		hasPaymentAction: Boolean(props.paymentAction),
		hasSavedRecordAction: Boolean(props.savedRecordAction),
		enableSavedRecordActions: props.enableSavedRecordActions,
		hasOverviewAction: Boolean(props.onOpenOverview),
		hasPreviewAction: Boolean(props.onPreview),
		hasPrintAction: Boolean(props.onPrint),
		hasDownloadPdfAction: Boolean(props.onDownloadPdf),
		capabilities: props.capabilities,
		permissions: props.permissions,
	});
	const menuVisibility = resolveSalesFormFloatingActionsVisibility({
		isSaved: props.isSaved,
		canAddItem: Boolean(props.onAddItem),
		canSaveDraft: Boolean(props.onSaveDraft),
		hasPaymentAction: Boolean(props.paymentMenuAction),
		hasSavedRecordAction: Boolean(props.savedRecordMenuAction),
		enableSavedRecordActions: props.enableSavedRecordActions,
		hasOverviewAction: Boolean(props.onOpenOverview),
		hasPreviewAction: Boolean(props.onPreview),
		hasPrintAction: Boolean(props.onPrint),
		hasDownloadPdfAction: Boolean(props.onDownloadPdf),
		capabilities: props.capabilities,
		permissions: props.permissions,
	});
	const showSavedActions =
		visibility.payment ||
		visibility.savedRecord ||
		visibility.overview ||
		visibility.preview ||
		visibility.print ||
		visibility.downloadPdf;

	if (!visibility.addItem && !visibility.saveDraft && !showSavedActions) {
		return null;
	}

	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-1 z-20 hidden justify-center px-2 pb-[env(safe-area-inset-bottom)] lg:flex">
			<TooltipProvider delayDuration={120}>
				<div className="pointer-events-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-card/95 p-1 shadow-lg backdrop-blur">
					{visibility.addItem ? (
						<FloatingActionTooltip label="Add item">
							<Button
								type="button"
								size="icon"
								onClick={props.onAddItem}
								className="size-8 rounded-full"
								aria-label="Add item"
							>
								<Icons.Plus className="size-3.5" />
							</Button>
						</FloatingActionTooltip>
					) : null}

					{showSavedActions ? (
						<div className="hidden items-center gap-1 xl:flex">
							{visibility.payment ? props.paymentAction : null}
							{visibility.savedRecord ? props.savedRecordAction : null}
							{visibility.overview ? (
								<FloatingActionTooltip label="Overview">
									<Button
										type="button"
										size="icon"
										variant="outline"
										onClick={props.onOpenOverview}
										className="size-8 rounded-full"
										aria-label="Overview"
									>
										<Icons.ExternalLink className="size-3.5" />
									</Button>
								</FloatingActionTooltip>
							) : null}
							{visibility.preview ? (
								<FloatingActionTooltip
									label={props.isPreviewing ? "Preparing preview" : "Preview"}
								>
									<Button
										type="button"
										size="icon"
										variant="outline"
										onClick={() => void props.onPreview?.()}
										disabled={props.isSaving || props.isPreviewing}
										className="size-8 rounded-full"
										aria-label={
											props.isPreviewing ? "Preparing preview" : "Preview"
										}
									>
										{props.isPreviewing ? (
											<Icons.Loader2 className="size-3.5 animate-spin" />
										) : (
											<Icons.Eye className="size-3.5" />
										)}
									</Button>
								</FloatingActionTooltip>
							) : null}
							{visibility.print ? (
								<FloatingActionTooltip
									label={props.isPrinting ? "Preparing print" : "Print"}
								>
									<Button
										type="button"
										size="icon"
										variant="outline"
										onClick={(event) => void props.onPrint?.(event)}
										disabled={props.isPrinting}
										className="size-8 rounded-full"
										aria-label={props.isPrinting ? "Preparing print" : "Print"}
									>
										{props.isPrinting ? (
											<Icons.Loader2 className="size-3.5 animate-spin" />
										) : (
											<Icons.Printer className="size-3.5" />
										)}
									</Button>
								</FloatingActionTooltip>
							) : null}
							{visibility.downloadPdf ? (
								<FloatingActionTooltip
									label={props.isDownloading ? "Preparing PDF" : "PDF"}
								>
									<Button
										type="button"
										size="icon"
										variant="outline"
										onClick={() => void props.onDownloadPdf?.()}
										disabled={props.isDownloading}
										className="size-8 rounded-full"
										aria-label={props.isDownloading ? "Preparing PDF" : "PDF"}
									>
										{props.isDownloading ? (
											<Icons.Loader2 className="size-3.5 animate-spin" />
										) : (
											<Icons.FileText className="size-3.5" />
										)}
									</Button>
								</FloatingActionTooltip>
							) : null}
						</div>
					) : null}

					{menuVisibility.moreMenu ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant="outline"
									className="size-8 shrink-0 rounded-full xl:hidden"
									aria-label="More actions"
								>
									<Icons.MoreHorizontal className="size-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-52">
								{menuVisibility.payment ? props.paymentMenuAction : null}
								{menuVisibility.savedRecord
									? props.savedRecordMenuAction
									: null}
								{menuVisibility.overview ? (
									<DropdownMenuItem onSelect={props.onOpenOverview}>
										<Icons.ExternalLink className="mr-2 size-4" />
										Overview
									</DropdownMenuItem>
								) : null}
								{menuVisibility.preview ? (
									<DropdownMenuItem
										disabled={props.isSaving || props.isPreviewing}
										onSelect={(event) => {
											event.preventDefault();
											void props.onPreview?.();
										}}
									>
										{props.isPreviewing ? (
											<Icons.Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Icons.Eye className="mr-2 size-4" />
										)}
										{props.isPreviewing ? "Preparing..." : "Preview"}
									</DropdownMenuItem>
								) : null}
								{menuVisibility.print ? (
									<DropdownMenuItem
										disabled={props.isPrinting}
										onSelect={(event) => {
											event.preventDefault();
											void props.onPrint?.();
										}}
									>
										{props.isPrinting ? (
											<Icons.Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Icons.Printer className="mr-2 size-4" />
										)}
										{props.isPrinting ? "Preparing..." : "Print"}
									</DropdownMenuItem>
								) : null}
								{menuVisibility.downloadPdf ? (
									<DropdownMenuItem
										disabled={props.isDownloading}
										onSelect={(event) => {
											event.preventDefault();
											void props.onDownloadPdf?.();
										}}
									>
										{props.isDownloading ? (
											<Icons.Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Icons.FileText className="mr-2 size-4" />
										)}
										{props.isDownloading ? "Preparing..." : "PDF"}
									</DropdownMenuItem>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}

					{visibility.saveDraft ? (
						<FloatingSaveChoice
							isSaving={props.isSaving}
							onSaveDraft={props.onSaveDraft}
							onSaveClose={props.onSaveClose}
							onSaveNew={props.onSaveNew}
						/>
					) : null}
				</div>
			</TooltipProvider>
		</div>
	);
}
