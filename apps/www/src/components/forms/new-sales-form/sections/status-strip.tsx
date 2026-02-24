"use client";

import type { SaveStatus } from "../schema";
import { cn } from "@gnd/ui/cn";

interface Props {
    saveStatus: SaveStatus;
    dirty: boolean;
    lastSavedAt?: string | null;
    message?: string | null;
}

function statusLabel(saveStatus: SaveStatus, dirty: boolean) {
    if (saveStatus === "saving") return "Saving...";
    if (saveStatus === "saved" && !dirty) return "All changes saved";
    if (saveStatus === "stale") return "Out of date";
    if (saveStatus === "error") return "Save failed";
    if (dirty) return "Unsaved changes";
    return "Idle";
}

function statusClass(saveStatus: SaveStatus, dirty: boolean) {
    if (saveStatus === "saving") return "bg-amber-50 text-amber-700 border-amber-200";
    if (saveStatus === "saved" && !dirty)
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (saveStatus === "stale") return "bg-red-50 text-red-700 border-red-200";
    if (saveStatus === "error") return "bg-red-50 text-red-700 border-red-200";
    if (dirty) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-muted text-muted-foreground border-border";
}

export function StatusStrip(props: Props) {
    return (
        <div className="rounded-lg border p-3">
            <div
                className={cn(
                    "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
                    statusClass(props.saveStatus, props.dirty),
                )}
            >
                {statusLabel(props.saveStatus, props.dirty)}
            </div>
            {props.lastSavedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    Last saved: {new Date(props.lastSavedAt).toLocaleString()}
                </p>
            ) : null}
            {props.message ? (
                <p className="mt-1 text-xs text-red-600">{props.message}</p>
            ) : null}
        </div>
    );
}

