/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import type { MouseEvent, ReactNode } from "react";
import type { SalesFormCapabilities, SalesFormPermissions } from "../contracts";
import { salesFormStatusClass, salesFormStatusLabel } from "./status-utils";
import type { SalesFormHeaderItemOption, SalesFormSaveStatus } from "./types";

export type SalesFormHeaderActionsProps = {
	type: "order" | "quote";
	orderId?: string | null;
	isSaved?: boolean;
	isSaving?: boolean;
	saveStatus?: SalesFormSaveStatus;
	dirty?: boolean;
	lastSavedAt?: string | null;
	statusMessage?: string | null;
	autosaveEnabled?: boolean;
	stepDisplayMode?: "compact" | "extended";
	onAddItem?: () => void;
	onToggleStepDisplay?: () => void;
	onOpenMobileSummary?: () => void;
	onToggleAutosave?: () => void;
	onSaveDraft?: () => Promise<void> | void;
	onSaveClose?: () => Promise<void> | void;
	onSaveNew?: () => Promise<void> | void;
	onSaveFinal?: () => Promise<void> | void;
	onOpenOverview?: () => void;
	onPreview?: () => Promise<void> | void;
	onPrint?: (event?: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
	isPreviewing?: boolean;
	isPrinting?: boolean;
	showPackingControls?: boolean;
	packingButtonLabel?: string;
	packingBusy?: boolean;
	onSendForPacking?: () => Promise<void> | void;
	onCancelPacking?: () => Promise<void> | void;
	cancelPackingDisabled?: boolean;
	onCompletePacking?: () => Promise<void> | void;
	completePackingDisabled?: boolean;
	onOpenPacking?: () => void;
	openPackingDisabled?: boolean;
	onOpenSettings?: () => void;
	activeItem?: string | null;
	itemOptions?: SalesFormHeaderItemOption[];
	onActiveItemChange?: (value: string) => void;
	capabilities?: Partial<SalesFormCapabilities>;
	permissions?: Partial<SalesFormPermissions>;
};

function HeaderActionTooltip({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="bottom" className="px-2 py-1 text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function SalesFormHeaderActions(props: SalesFormHeaderActionsProps) {
	const canOpenOverview =
		props.capabilities?.internalOverview !== false &&
		props.permissions?.canOpenInternalOverview !== false &&
		!!props.onOpenOverview;
	const canPrint =
		props.capabilities?.printing !== false &&
		props.permissions?.canPrint !== false &&
		!!props.onPrint;
	const canPreview =
		props.capabilities?.printing !== false &&
		props.permissions?.canPrint !== false &&
		!!props.onPreview;
	const canPack =
		props.showPackingControls &&
		props.capabilities?.packing !== false &&
		props.permissions?.canSendPacking !== false;
	const canSaveDraft =
		props.permissions?.canSaveDraft !== false && !!props.onSaveDraft;
	const canFinalize =
		props.permissions?.canFinalize !== false && !!props.onSaveFinal;
	const canOpenSettings =
		props.capabilities?.settings !== false &&
		props.permissions?.canOpenSettings !== false &&
		!!props.onOpenSettings;
	const packingTooltip = props.packingButtonLabel || "Packing";

	return (
		<header className="border-b bg-card px-4 py-3 sm:px-6">
			<TooltipProvider delayDuration={120}>
				<div className="flex w-full flex-wrap items-center gap-2">
				<div className="min-w-0 flex-1">
					<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						Sales Invoice Editor
					</p>
					<h2 className="truncate text-lg font-semibold capitalize">
						{props.orderId
							? `Editing ${props.type} ${props.orderId}`
							: `New ${props.type}`}
					</h2>
					<div className="mt-1 hidden flex-wrap items-center gap-2 lg:flex">
						<span
							className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold ${salesFormStatusClass(props.saveStatus, props.dirty)}`}
						>
							{salesFormStatusLabel(props.saveStatus, props.dirty)}
						</span>
						{props.lastSavedAt ? (
							<span className="text-[10px] text-muted-foreground">
								Last saved: {new Date(props.lastSavedAt).toLocaleString()}
							</span>
						) : null}
						{props.statusMessage ? (
							<span className="text-[10px] text-red-600">
								{props.statusMessage}
							</span>
						) : null}
					</div>
				</div>
				<div className="ml-auto hidden items-center justify-end gap-2 lg:flex">
					{canOpenOverview ? (
						<Button
							size="sm"
							variant="outline"
							className="px-3"
							onClick={props.onOpenOverview}
							disabled={props.isSaving || !props.isSaved}
						>
							<Icons.Layout className="size-4" />
							Overview
						</Button>
					) : null}
					{canPreview ? (
						<HeaderActionTooltip
							label={props.isPreviewing ? "Preparing preview" : "Preview"}
						>
							<Button
								size="icon"
								variant="outline"
								onClick={() => void props.onPreview?.()}
								disabled={props.isSaving || props.isPreviewing}
								aria-label={props.isPreviewing ? "Preparing preview" : "Preview"}
							>
								{props.isPreviewing ? (
									<Icons.Loader2 className="size-4 animate-spin" />
								) : (
									<Icons.Eye className="size-4" />
								)}
							</Button>
						</HeaderActionTooltip>
					) : null}
					{canPrint ? (
						<HeaderActionTooltip
							label={props.isPrinting ? "Preparing print" : "Print"}
						>
							<Button
								size="icon"
								variant="outline"
								onClick={(event) => void props.onPrint?.(event)}
								disabled={props.isSaving || !props.isSaved || props.isPrinting}
								aria-label={props.isPrinting ? "Preparing print" : "Print"}
							>
								{props.isPrinting ? (
									<Icons.Loader2 className="size-4 animate-spin" />
								) : (
									<Icons.Printer className="size-4" />
								)}
							</Button>
						</HeaderActionTooltip>
					) : null}
					{canPack ? (
						<HeaderActionTooltip label={packingTooltip}>
							<Button
								size="icon"
								variant="outline"
								onClick={() => void props.onSendForPacking?.()}
								disabled={props.packingBusy || !props.isSaved}
								aria-label={packingTooltip}
							>
								<Icons.packingList className="size-4" />
							</Button>
						</HeaderActionTooltip>
					) : null}
				</div>
				<div className="order-2 flex w-full min-w-0 items-center gap-2 lg:hidden">
					<div className="min-w-0 flex-1">
						<Select
							value={props.activeItem || undefined}
							onValueChange={props.onActiveItemChange}
							disabled={(props.itemOptions?.length || 0) <= 1}
						>
							<SelectTrigger className="h-9 w-full min-w-0">
								<SelectValue placeholder="Select item" />
							</SelectTrigger>
							<SelectContent>
								{(props.itemOptions || []).map((option) => (
									<SelectItem
										key={`header-item-${option.uid}`}
										value={option.uid}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						size="icon"
						variant="outline"
						onClick={props.onAddItem}
						disabled={props.isSaving}
						aria-label="Add new item"
					>
						<Icons.Plus className="size-4" />
					</Button>
					<Button
						size="icon"
						variant="outline"
						onClick={props.onOpenMobileSummary}
						disabled={!props.onOpenMobileSummary}
						aria-label="Open invoice summary"
					>
						<Icons.Sidebar className="size-4" />
					</Button>
				</div>
				<Menu
					Icon={Icons.MoreHorizontal}
					Trigger={
						<Button
							size="sm"
							variant="outline"
							className="size-9 px-0 lg:w-auto lg:px-3"
							disabled={props.isSaving}
							aria-label="Open actions menu"
						>
							<Icons.MoreHorizontal className="size-4" />
							<span className="hidden lg:inline">Actions</span>
						</Button>
					}
				>
					<Menu.Item Icon={Icons.Plus} disabled={props.isSaving} onClick={props.onAddItem}>
						Add Item
					</Menu.Item>
					{props.onToggleStepDisplay ? (
						<Menu.Item Icon={Icons.Layout} onClick={props.onToggleStepDisplay}>
							{props.stepDisplayMode === "extended"
								? "Compact Steps"
								: "Extended Steps"}
						</Menu.Item>
					) : null}
					{props.onOpenMobileSummary ? (
						<Menu.Item Icon={Icons.Sidebar} onClick={props.onOpenMobileSummary}>
							Invoice Summary
						</Menu.Item>
					) : null}
					{props.onToggleAutosave ? (
						<Menu.Item Icon={Icons.Save} onClick={props.onToggleAutosave}>
							Autosave: {props.autosaveEnabled ? "On" : "Off"}
						</Menu.Item>
					) : null}
					{canPreview ? (
						<Menu.Item
							Icon={props.isPreviewing ? Icons.Loader2 : Icons.Eye}
							disabled={props.isSaving || props.isPreviewing}
							onClick={() => void props.onPreview?.()}
						>
							{props.isPreviewing ? "Preparing Preview" : "Preview"}
						</Menu.Item>
					) : null}
					{canPrint ? (
						<Menu.Item
							Icon={props.isPrinting ? Icons.Loader2 : Icons.Printer}
							disabled={props.isSaving || !props.isSaved || props.isPrinting}
							onClick={() => void props.onPrint?.()}
						>
							{props.isPrinting ? "Preparing Print" : "Print"}
						</Menu.Item>
					) : null}
					{canPack ? (
						<>
							<Menu.Item
								Icon={Icons.packingList}
								disabled={props.packingBusy || !props.isSaved}
								onClick={() => void props.onSendForPacking?.()}
							>
								Packing
							</Menu.Item>
							<Menu.Item
								Icon={Icons.XCircle}
								disabled={props.cancelPackingDisabled}
								onClick={() => void props.onCancelPacking?.()}
							>
								Cancel Packing
							</Menu.Item>
							<Menu.Item
								Icon={Icons.CheckCheck}
								disabled={props.completePackingDisabled}
								onClick={() => void props.onCompletePacking?.()}
							>
								Complete Packing
							</Menu.Item>
							<Menu.Item
								Icon={Icons.ExternalLink}
								disabled={props.openPackingDisabled}
								onClick={props.onOpenPacking}
							>
								Open Packing
							</Menu.Item>
						</>
					) : null}
					{props.onSaveDraft ? (
						<Menu.Item
							Icon={Icons.Save}
							disabled={props.isSaving || !canSaveDraft}
							onClick={() => void props.onSaveDraft?.()}
						>
							Save Draft
						</Menu.Item>
					) : null}
					{props.onSaveClose ? (
						<Menu.Item
							Icon={Icons.LogOut}
							disabled={props.isSaving || !canSaveDraft}
							onClick={() => void props.onSaveClose?.()}
						>
							Save & Close
						</Menu.Item>
					) : null}
					{props.onSaveNew ? (
						<Menu.Item
							Icon={Icons.Plus}
							disabled={props.isSaving || !canSaveDraft}
							onClick={() => void props.onSaveNew?.()}
						>
							Save & New
						</Menu.Item>
					) : null}
					{props.onSaveFinal ? (
						<Menu.Item
							Icon={Icons.CheckCheck}
							disabled={props.isSaving || !canFinalize}
							onClick={() => void props.onSaveFinal?.()}
						>
							Save Final
						</Menu.Item>
					) : null}
					{canOpenSettings ? (
						<Menu.Item Icon={Icons.Settings2} onClick={props.onOpenSettings}>
							Settings
						</Menu.Item>
					) : null}
				</Menu>
				</div>
			</TooltipProvider>
		</header>
	);
}
