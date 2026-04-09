import { Icons } from "@gnd/ui/icons";
import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type ActivityNode = {
    id: number;
    createdAt: Date | string | null;
    subject: string | null;
    headline: string | null;
    note: string | null;
    senderContactName?: string | null;
    children: ActivityNode[];
};

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

function activityHeadline(node: ActivityNode) {
    return node.headline || node.subject || "Activity";
}

function activitySubject(node: ActivityNode) {
    if (!node.subject) return null;
    const headline = activityHeadline(node);
    return node.subject === headline ? null : node.subject;
}

function activityAuthor(node: ActivityNode) {
    return node.senderContactName || "Unknown";
}

function TimelineItem({
    node,
    depth = 0,
    isLatest = false,
}: {
    node: ActivityNode;
    depth?: number;
    isLatest?: boolean;
}) {
    return (
        <div className={`relative pl-8 ${depth > 0 ? "ml-4" : ""}`}>
            <div
                className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-card z-10 flex items-center justify-center ${isLatest ? "bg-green-500" : "bg-muted"}`}
            >
                {isLatest ? (
                    <Icons.CheckCircle2 size={12} className="text-white" />
                ) : (
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                )}
            </div>

            <p className="text-xs font-bold text-muted-foreground">
                {formatActivityDate(node.createdAt)}
            </p>
            <p className="text-sm font-semibold text-foreground">
                {activityHeadline(node)}
            </p>
            {activitySubject(node) ? (
                <p className="mt-1 text-sm text-muted-foreground">
                    {activitySubject(node)}
                </p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
                By {activityAuthor(node)}
            </p>
            {node.note ? (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-sm leading-6 text-foreground/90">
                        {node.note}
                    </p>
                </div>
            ) : null}

            {node.children?.length ? (
                <div className="mt-4 space-y-6">
                    {node.children.map((child) => (
                        <TimelineItem
                            key={`${node.id}-${child.id}`}
                            node={child}
                            depth={depth + 1}
                            isLatest={false}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function ActivityHistory() {
    const { overview } = useJobOverviewContext();
    const trpc = useTRPC();
    const jobId = Number(overview?.id || 0);
    const tagFilters = useMemo(
        () => [{ tagName: "jobId", tagValue: jobId }],
        [jobId],
    );
    const { data, isPending, isError } = useQuery(
        trpc.notes.activityTree.queryOptions(
            {
                tagFilters,
                tagFilterMode: "all",
                includeChildren: true,
                pageSize: 40,
                maxDepth: 4,
            },
            {
                enabled: jobId > 0,
            },
        ),
    );
    const rows = (data?.data || []) as ActivityNode[];

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">
                Activity Timeline
            </h4>
            {isPending ? (
                <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-16 animate-pulse rounded-lg bg-muted/40"
                        />
                    ))}
                </div>
            ) : isError ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                    Unable to load activity history
                </p>
            ) : !rows.length ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    No activity yet
                </div>
            ) : (
                <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
                    {rows.map((node, index) => (
                        <TimelineItem
                            key={node.id}
                            node={node}
                            isLatest={index === 0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
