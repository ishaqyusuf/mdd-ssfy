"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { MoreHorizontal } from "lucide-react";

interface Props {
    type: "order" | "quote";
    orderId?: string | null;
    isSaving?: boolean;
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
