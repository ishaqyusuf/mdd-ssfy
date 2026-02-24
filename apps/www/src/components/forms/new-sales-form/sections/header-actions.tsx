"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { MoreHorizontal } from "lucide-react";
import type { SaveStatus } from "../schema";

interface Props {
    type: "order" | "quote";
    orderId?: string | null;
    isSaving?: boolean;
    saveStatus?: SaveStatus;
    dirty?: boolean;
    lastSavedAt?: string | null;
    statusMessage?: string | null;
    isOverviewOpen?: boolean;
    autosaveEnabled?: boolean;
    onSaveDraft: () => Promise<void> | void;
    onSaveFinal: () => Promise<void> | void;
    onSaveClose: () => Promise<void> | void;
    onSaveNew: () => Promise<void> | void;
    onAddLineItem: () => void;
    onToggleOverview?: () => void;
    onOpenMobileSummary?: () => void;
    onToggleAutosave?: () => void;
    onOpenSettings?: () => void;
}

function statusLabel(saveStatus: SaveStatus | undefined, dirty: boolean | undefined) {
    if (saveStatus === "saving") return "Saving...";
    if (saveStatus === "saved" && !dirty) return "All changes saved";
    if (saveStatus === "stale") return "Out of date";
    if (saveStatus === "error") return "Save failed";
    if (dirty) return "Unsaved changes";
    return "Idle";
}

function statusClass(saveStatus: SaveStatus | undefined, dirty: boolean | undefined) {
    if (saveStatus === "saving") return "bg-amber-50 text-amber-700 border-amber-200";
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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
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

                <div className="hidden items-center gap-2 rounded-lg border bg-muted/20 px-2 py-1 md:flex">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={props.onAddLineItem}
                        disabled={props.isSaving}
                    >
                        Add Item
                    </Button>
                </div>

                <div className="hidden items-center gap-2 rounded-lg border bg-muted/20 px-2 py-1 md:flex">
                    <Button
                        size="sm"
                        variant="outline"
                        className="xl:hidden"
                        onClick={props.onOpenMobileSummary}
                    >
                        Invoice Summary
                    </Button>
                    <Button size="sm" variant="outline" onClick={props.onToggleAutosave}>
                        Autosave: {props.autosaveEnabled ? "On" : "Off"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void props.onSaveDraft()}
                        disabled={props.isSaving}
                    >
                        Save Draft
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void props.onSaveClose()}
                        disabled={props.isSaving}
                    >
                        Save & Close
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void props.onSaveNew()}
                        disabled={props.isSaving}
                    >
                        Save & New
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => void props.onSaveFinal()}
                        disabled={props.isSaving}
                    >
                        Save Final
                    </Button>
                    <Menu
                        Icon={MoreHorizontal}
                        iconClassName="size-4"
                        Trigger={
                            <Button
                                size="sm"
                                variant="outline"
                                className="px-2"
                                disabled={props.isSaving}
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        }
                    >
                        <Menu.Item disabled>Overview</Menu.Item>
                        <Menu.Item disabled>Send</Menu.Item>
                        <Menu.Item disabled>Print</Menu.Item>
                        <Menu.Item onClick={props.onOpenSettings}>Settings</Menu.Item>
                    </Menu>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                    <Button size="sm" variant="outline" onClick={props.onOpenMobileSummary}>
                        Summary
                    </Button>
                    <Button size="sm" onClick={() => void props.onSaveFinal()} disabled={props.isSaving}>
                        Finalize
                    </Button>
                </div>
            </div>
        </header>
    );
}
