"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import type { SaveStatus } from "../schema";

interface Props {
	type: "order" | "quote";
	orderId?: string | null;
	isSaved?: boolean;
	isSaving?: boolean;
	saveStatus?: SaveStatus;
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
	onPrint?: () => Promise<void> | void;
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
}

function statusLabel(
	saveStatus: SaveStatus | undefined,
	dirty: boolean | undefined,
) {
	if (saveStatus === "saving") return "Saving...";
	if (saveStatus === "saved" && !dirty) return "All changes saved";
	if (saveStatus === "stale") return "Out of date";
	if (saveStatus === "error") return "Save failed";
	if (dirty) return "Unsaved changes";
	return "Idle";
}

function statusClass(
	saveStatus: SaveStatus | undefined,
	dirty: boolean | undefined,
) {
	if (saveStatus === "saving")
		return "bg-amber-50 text-amber-700 border-amber-200";
	if (saveStatus === "saved" && !dirty)
		return "bg-emerald-50 text-emerald-700 border-emerald-200";
	if (saveStatus === "stale") return "bg-red-50 text-red-700 border-red-200";
	if (saveStatus === "error") return "bg-red-50 text-red-700 border-red-200";
	if (dirty) return "bg-orange-50 text-orange-700 border-orange-200";
	return "bg-muted text-muted-foreground border-border";
}

export function HeaderActions(props: Props) {
	return (
		<header className="border-b bg-card px-4 py-3 sm:px-6">
			<div className="flex flex-wrap items-center gap-2">
				<div className="mr-auto min-w-0">
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
							className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold ${statusClass(props.saveStatus, props.dirty)}`}
						>
							{statusLabel(props.saveStatus, props.dirty)}
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
				<div className="hidden items-center gap-2 lg:flex">
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
					<Button
						size="icon"
						variant="outline"
						onClick={() => void props.onPrint?.()}
						disabled={props.isSaving || !props.isSaved}
					>
						<Icons.Printer className="size-4" />
					</Button>
					{props.showPackingControls ? (
						<div className="flex items-center">
							<Button
								size="sm"
								variant="outline"
								className="rounded-r-none px-3"
								onClick={() => void props.onSendForPacking?.()}
								disabled={props.packingBusy || !props.isSaved}
							>
								<Icons.packingList className="size-4" />
								{props.packingButtonLabel || "Send for Packing"}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										className="-ml-px rounded-l-none"
										disabled={props.packingBusy || !props.isSaved}
									>
										<Icons.MoreVertical className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										disabled={props.cancelPackingDisabled}
										onSelect={(event) => {
											event.preventDefault();
											void props.onCancelPacking?.();
										}}
									>
										<Icons.XCircle className="mr-2 size-4" />
										Cancel
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={props.completePackingDisabled}
										onSelect={(event) => {
											event.preventDefault();
											void props.onCompletePacking?.();
										}}
									>
										<Icons.CheckCheck className="mr-2 size-4" />
										Mark as Completed
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={props.openPackingDisabled}
										onSelect={(event) => {
											event.preventDefault();
											props.onOpenPacking?.();
										}}
									>
										<Icons.ExternalLink className="mr-2 size-4" />
										Open
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					) : null}
				</div>
				<Menu
					Icon={Icons.MoreHorizontal}
					iconClassName="size-4"
					Trigger={
						<Button
							size="sm"
							variant="outline"
							className="hidden px-3 lg:inline-flex"
							disabled={props.isSaving}
						>
							<Icons.MoreHorizontal className="size-4" />
							Actions
						</Button>
					}
				>
					<Menu.Item disabled={props.isSaving} onClick={props.onAddItem}>
						Add Item
					</Menu.Item>
					<Menu.Item onClick={props.onToggleStepDisplay}>
						{props.stepDisplayMode === "extended"
							? "Compact Steps"
							: "Extended Steps"}
					</Menu.Item>
					<Menu.Item onClick={props.onOpenMobileSummary}>
						Invoice Summary
					</Menu.Item>
					<Menu.Item onClick={props.onToggleAutosave}>
						Autosave: {props.autosaveEnabled ? "On" : "Off"}
					</Menu.Item>
					<Menu.Item
						disabled={props.isSaving}
						onClick={() => void props.onSaveDraft?.()}
					>
						Save Draft
					</Menu.Item>
					<Menu.Item
						disabled={props.isSaving}
						onClick={() => void props.onSaveClose?.()}
					>
						Save & Close
					</Menu.Item>
					<Menu.Item
						disabled={props.isSaving}
						onClick={() => void props.onSaveNew?.()}
					>
						Save & New
					</Menu.Item>
					<Menu.Item
						disabled={props.isSaving}
						onClick={() => void props.onSaveFinal?.()}
					>
						Save Final
					</Menu.Item>
					<Menu.Item onClick={props.onOpenSettings}>Settings</Menu.Item>
				</Menu>
			</div>
		</header>
	);
}
