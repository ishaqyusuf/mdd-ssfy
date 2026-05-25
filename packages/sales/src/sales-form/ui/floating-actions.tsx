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
	moreMenu: boolean;
};

export type SalesFormFloatingActionsProps = {
	isSaved?: boolean;
	isSaving?: boolean;
	isPreviewing?: boolean;
	isPrinting?: boolean;
	capabilities?: Partial<SalesFormCapabilities>;
	permissions?: Partial<SalesFormPermissions>;
	onAddItem?: () => void;
	onSaveDraft?: () => Promise<void> | void;
	onOpenOverview?: () => void;
	onPreview?: () => Promise<void> | void;
	onPrint?: (event?: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
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

	return {
		addItem: canAddItem,
		saveDraft: canSaveDraft,
		payment,
		savedRecord,
		overview,
		preview,
		print,
		moreMenu: payment || savedRecord || overview || preview || print,
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
		capabilities: props.capabilities,
		permissions: props.permissions,
	});
	const showSavedActions =
		visibility.payment ||
		visibility.savedRecord ||
		visibility.overview ||
		visibility.preview ||
		visibility.print;

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
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}

					{visibility.saveDraft ? (
						<FloatingActionTooltip label={props.isSaving ? "Saving" : "Save"}>
							<Button
								type="button"
								size="icon"
								onClick={() => void props.onSaveDraft?.()}
								disabled={props.isSaving}
								className="size-8 rounded-full p-0"
								aria-label={props.isSaving ? "Saving" : "Save"}
							>
								{props.isSaving ? (
									<Icons.Loader2 className="size-3.5 animate-spin" />
								) : (
									<Icons.Save className="size-3.5" />
								)}
							</Button>
						</FloatingActionTooltip>
					) : null}
				</div>
			</TooltipProvider>
		</div>
	);
}
