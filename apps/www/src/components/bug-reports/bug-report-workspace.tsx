"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo, useState } from "react";
import {
    BUG_REPORT_STATUS_BADGE_CLASS,
    BUG_REPORT_STATUS_LABELS,
    BUG_REPORT_STATUS_OPTIONS,
    type BugReportStatus,
    formatBugReportDuration,
} from "./status";

type BugReportListItem = RouterOutputs["bugReports"]["mine"][number];

function formatDate(value?: Date | string | null) {
    if (!value) return "Unknown date";
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function StatusBadge({ status }: { status: BugReportStatus }) {
    return (
        <Badge
            variant="outline"
            className={cn("rounded-full", BUG_REPORT_STATUS_BADGE_CLASS[status])}
        >
            {BUG_REPORT_STATUS_LABELS[status]}
        </Badge>
    );
}

export function BugReportWorkspace() {
    const auth = useAuth();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
    const [statusFilter, setStatusFilter] = useState<"ALL" | BugReportStatus>(
        "ALL",
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [followUp, setFollowUp] = useState("");
    const listInput = useMemo(
        () =>
            statusFilter === "ALL"
                ? undefined
                : {
                      status: statusFilter,
                  },
        [statusFilter],
    );
    const myReports = useQuery(
        trpc.bugReports.mine.queryOptions(undefined, {
            enabled: auth.enabled && !isSuperAdmin,
        }),
    );
    const allReports = useQuery(
        trpc.bugReports.adminList.queryOptions(listInput, {
            enabled: auth.enabled && isSuperAdmin,
        }),
    );
    const reports = (isSuperAdmin ? allReports.data : myReports.data) ?? [];
    const selectedReport = reports.find((report) => report.id === selectedId);
    const detail = useQuery(
        trpc.bugReports.byId.queryOptions(
            { id: selectedId || "" },
            {
                enabled: Boolean(selectedId),
            },
        ),
    );

    const updateStatus = useMutation(
        trpc.bugReports.updateStatus.mutationOptions({
            async onSuccess(data) {
                await invalidateBugReportQueries(queryClient, trpc, data.id);
                toast({
                    title: "Bug report status updated",
                    variant: "success",
                });
            },
            onError(error) {
                toast({
                    title: "Unable to update status",
                    description: error.message,
                    variant: "destructive",
                });
            },
        }),
    );
    const addFollowUp = useMutation(
        trpc.bugReports.addFollowUp.mutationOptions({
            async onSuccess(data, variables) {
                await invalidateBugReportQueries(
                    queryClient,
                    trpc,
                    variables.bugReportId,
                );
                setFollowUp("");
                toast({
                    title: "Follow-up added",
                    variant: "success",
                });
            },
            onError(error) {
                toast({
                    title: "Unable to add follow-up",
                    description: error.message,
                    variant: "destructive",
                });
            },
        }),
    );

    useEffect(() => {
        if (!reports.length) {
            setSelectedId(null);
            return;
        }
        if (!selectedId || !reports.some((report) => report.id === selectedId)) {
            setSelectedId(reports[0]?.id ?? null);
        }
    }, [reports, selectedId]);

    return (
        <div className="grid min-h-[calc(100vh-170px)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col rounded-md border bg-background">
                <div className="flex items-center justify-between gap-3 border-b p-4">
                    <div>
                        <h2 className="text-sm font-semibold">
                            {isSuperAdmin ? "All reports" : "My reports"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {reports.length} submission
                            {reports.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    {isSuperAdmin ? (
                        <select
                            className="h-8 rounded-md border bg-background px-2 text-xs"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value as "ALL" | BugReportStatus,
                                )
                            }
                            aria-label="Filter bug reports by status"
                        >
                            <option value="ALL">All</option>
                            {BUG_REPORT_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {BUG_REPORT_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-2">
                    {reports.length ? (
                        <div className="space-y-2">
                            {reports.map((report) => (
                                <ReportListButton
                                    key={report.id}
                                    report={report}
                                    selected={report.id === selectedId}
                                    onClick={() => setSelectedId(report.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                            {isSuperAdmin
                                ? "No bug reports match this view."
                                : "You have not submitted a bug report yet."}
                        </div>
                    )}
                </div>
            </aside>

            <section className="min-h-0 rounded-md border bg-background">
                {selectedId && (detail.data || selectedReport) ? (
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                            <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <StatusBadge
                                        status={
                                            (detail.data?.status ||
                                                selectedReport?.status) as BugReportStatus
                                        }
                                    />
                                    <Badge variant="outline">
                                        {formatBugReportDuration(
                                            detail.data?.durationMs ||
                                                selectedReport?.durationMs,
                                        )}
                                    </Badge>
                                    {detail.data?.microphoneEnabled ||
                                    selectedReport?.microphoneEnabled ? (
                                        <Badge variant="outline">Mic on</Badge>
                                    ) : (
                                        <Badge variant="outline">Mic off</Badge>
                                    )}
                                </div>
                                <h2 className="truncate text-base font-semibold">
                                    {detail.data?.description ||
                                        selectedReport?.description ||
                                        "Bug report"}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Submitted{" "}
                                    {formatDate(
                                        detail.data?.createdAt ||
                                            selectedReport?.createdAt,
                                    )}
                                    {detail.data?.createdBy?.name
                                        ? ` by ${detail.data.createdBy.name}`
                                        : ""}
                                </p>
                            </div>
                            {isSuperAdmin && detail.data ? (
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor="bug-report-status"
                                        className="text-xs"
                                    >
                                        Status
                                    </Label>
                                    <select
                                        id="bug-report-status"
                                        className="h-9 rounded-md border bg-background px-2 text-sm"
                                        value={detail.data.status}
                                        disabled={updateStatus.isPending}
                                        onChange={(event) => {
                                            updateStatus.mutate({
                                                bugReportId: detail.data.id,
                                                status: event.target
                                                    .value as BugReportStatus,
                                            });
                                        }}
                                    >
                                        {BUG_REPORT_STATUS_OPTIONS.map(
                                            (status) => (
                                                <option key={status} value={status}>
                                                    {
                                                        BUG_REPORT_STATUS_LABELS[
                                                            status
                                                        ]
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            ) : null}
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto p-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                                <div className="space-y-4">
                                    {detail.data?.recording?.url ? (
                                        <video
                                            src={detail.data.recording.url}
                                            controls
                                            className="aspect-video w-full rounded-md border bg-black"
                                        />
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                                            Recording unavailable
                                        </div>
                                    )}
                                    {detail.data?.currentUrl ? (
                                        <div className="rounded-md border p-3 text-sm">
                                            <div className="mb-1 font-medium">
                                                Page URL
                                            </div>
                                            <a
                                                href={detail.data.currentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="break-all text-primary underline-offset-4 hover:underline"
                                            >
                                                {detail.data.currentUrl}
                                            </a>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-md border p-3">
                                        <h3 className="mb-3 text-sm font-semibold">
                                            Follow-ups
                                        </h3>
                                        <div className="space-y-3">
                                            {detail.data?.followUps?.length ? (
                                                detail.data.followUps.map(
                                                    (item) => (
                                                        <div
                                                            key={item.id}
                                                            className="rounded-md bg-muted/40 p-3 text-sm"
                                                        >
                                                            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                                <span>
                                                                    {item.author
                                                                        ?.name ||
                                                                        "Unknown"}
                                                                </span>
                                                                <span>
                                                                    {formatDate(
                                                                        item.createdAt,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="whitespace-pre-wrap">
                                                                {item.body}
                                                            </p>
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No follow-ups yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-md border p-3">
                                        <Label htmlFor="bug-follow-up">
                                            Add follow-up
                                        </Label>
                                        <Textarea
                                            id="bug-follow-up"
                                            className="mt-2"
                                            value={followUp}
                                            rows={4}
                                            onChange={(event) =>
                                                setFollowUp(event.target.value)
                                            }
                                            placeholder="Add an update, extra detail, or confirmation."
                                        />
                                        <Button
                                            type="button"
                                            className="mt-3 w-full"
                                            disabled={
                                                !followUp.trim() ||
                                                addFollowUp.isPending ||
                                                !selectedId
                                            }
                                            onClick={() => {
                                                if (!selectedId) return;
                                                addFollowUp.mutate({
                                                    bugReportId: selectedId,
                                                    body: followUp,
                                                });
                                            }}
                                        >
                                            <Icons.Send className="mr-2 size-4" />
                                            Send follow-up
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                        <Icons.MessageSquare className="size-8" />
                        <div className="max-w-sm text-sm">
                            Select a bug report to view the recording, status,
                            and follow-up thread.
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function ReportListButton({
    report,
    selected,
    onClick,
}: {
    report: BugReportListItem;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={cn(
                "w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/60",
                selected ? "border-primary bg-primary/5" : "bg-background",
            )}
            onClick={onClick}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <StatusBadge status={report.status as BugReportStatus} />
                <span className="text-xs text-muted-foreground">
                    {formatBugReportDuration(report.durationMs)}
                </span>
            </div>
            <div className="line-clamp-2 text-sm font-medium">
                {report.description || "Bug report"}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                    {report.createdBy?.name || "You"}
                </span>
                <span>{formatDate(report.createdAt)}</span>
            </div>
            {report.followUpCount ? (
                <div className="mt-2 text-xs text-muted-foreground">
                    {report.followUpCount} follow-up
                    {report.followUpCount === 1 ? "" : "s"}
                </div>
            ) : null}
        </button>
    );
}

async function invalidateBugReportQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    trpc: ReturnType<typeof useTRPC>,
    reportId?: string,
) {
    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: trpc.bugReports.mine.queryKey(),
        }),
        queryClient.invalidateQueries({
            queryKey: trpc.bugReports.adminList.queryKey(),
        }),
        reportId
            ? queryClient.invalidateQueries({
                  queryKey: trpc.bugReports.byId.queryKey({ id: reportId }),
              })
            : Promise.resolve(),
    ]);
}
