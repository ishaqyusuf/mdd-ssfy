"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getColorFromName, hexToRgba } from "@gnd/utils/colors";
import { useMemo } from "react";

export type ActivityTagFilter = {
    tagName: string;
    tagValue: unknown;
};

type ActivityNode = {
    id: number;
    createdAt: Date | string | null;
    subject: string | null;
    headline: string | null;
    note: string | null;
    tags: Record<string, unknown>;
    children: ActivityNode[];
};

export interface ActivityHistoryProps {
    channel?: string;
    tags?: ActivityTagFilter[];
    contactId?: number;
    pageSize?: number;
    maxDepth?: number;
    className?: string;
    emptyText?: string;
}

function formatActivityDate(value: Date | string | null | undefined) {
    if (!value) return "No date";
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "No date";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(dateValue);
}

function activityLabel(node: ActivityNode) {
    return node.headline || node.subject || "Activity";
}

function activityNote(node: ActivityNode) {
    if (!node.note) return "";
    return node.note;
}

function channelColor(node: ActivityNode) {
    const value =
        typeof node.tags?.noteColor === "string"
            ? node.tags.noteColor
            : typeof node.tags?.channel === "string"
              ? node.tags.channel
              : typeof node.tags?.type === "string"
                ? node.tags.type
                : "activity";

    if (typeof value === "string" && value.startsWith("#")) return value;
    return getColorFromName(value);
}

function ActivityTreeItem({
    node,
    depth = 0,
}: {
    node: ActivityNode;
    depth?: number;
}) {
    const color = channelColor(node);
    const hasChildren = node.children.length > 0;
    const indentClass = depth > 0 ? "pl-6" : "";

    return (
        <div className={cn("py-3", indentClass)}>
            <div className="grid grid-cols-[16px_1fr] gap-3">
                <div className="relative pt-1">
                    <span
                        className="absolute left-0 top-1.5 size-2.5 rounded-full"
                        style={{
                            backgroundColor: color,
                        }}
                    />
                </div>
                <div className="min-w-0">
                    <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {activityLabel(node)}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            {formatActivityDate(node.createdAt)}
                        </span>
                    </div>
                    {!!activityNote(node) && (
                        <p
                            className="mt-1 whitespace-pre-wrap rounded px-2 py-1 text-sm text-muted-foreground"
                            style={{
                                backgroundColor: hexToRgba(color, 0.08),
                            }}
                        >
                            {activityNote(node)}
                        </p>
                    )}
                </div>
            </div>

            {hasChildren && (
                <div className="mt-2 space-y-1">
                    {node.children.map((child) => (
                        <ActivityTreeItem
                            key={`${node.id}-${child.id}`}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function ActivityHistory({
    channel,
    tags = [],
    contactId,
    pageSize = 40,
    maxDepth = 4,
    className,
    emptyText = "No activity yet",
}: ActivityHistoryProps) {
    const trpc = useTRPC();
    const tagFilters = useMemo(
        () => [
            ...(tags || []),
            ...(channel
                ? [{ tagName: "channel", tagValue: channel } as ActivityTagFilter]
                : []),
        ],
        [channel, tags],
    );

    const { data, isPending, isError } = useQuery(
        trpc.notes.activityTree.queryOptions({
            ...(contactId ? { contactIds: [contactId] } : {}),
            ...(tagFilters.length ? { tagFilters } : {}),
            tagFilterMode: "all",
            includeChildren: true,
            pageSize,
            maxDepth,
        }),
    );

    if (isPending) {
        return (
            <div className={cn("space-y-2", className)}>
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-12 animate-pulse rounded bg-muted/40"
                    />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
                Unable to load activity history
            </div>
        );
    }

    const rows = (data?.data || []) as ActivityNode[];

    if (!rows.length) {
        return (
            <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
                {emptyText}
            </div>
        );
    }

    return (
        <div className={cn("space-y-0", className)}>
            {rows.map((item, index) => (
                <div key={item.id}>
                    <ActivityTreeItem node={item} />
                    {index < rows.length - 1 && <Separator />}
                </div>
            ))}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icons.FolderTree className="size-3.5" />
                <span>Activity chain</span>
            </div>
        </div>
    );
}
