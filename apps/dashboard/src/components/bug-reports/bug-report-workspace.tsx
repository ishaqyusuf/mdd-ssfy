"use client";

import { BugReportsColumnVisibility } from "@/components/tables-2/bug-reports/column-visibility";
import type { BugReportRow } from "@/components/tables-2/bug-reports/columns";
import { DataTable as BugReportsDataTable } from "@/components/tables-2/bug-reports/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
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

type BugReportCaptureType = "VIDEO" | "SCREENSHOT";

const CAPTURE_TYPE_LABELS: Record<BugReportCaptureType, string> = {
	VIDEO: "Video",
	SCREENSHOT: "Screenshot",
};

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

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function BugReportWorkspace({ initialSettings }: Props) {
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
	const isLoadingReports = isSuperAdmin
		? allReports.isLoading
		: myReports.isLoading;
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
				const reportId =
					variables && "bugReportId" in variables
						? variables.bugReportId
						: undefined;
				await invalidateBugReportQueries(queryClient, trpc, reportId);
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
		<div
			className="grid min-h-0 gap-4 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]"
			style={{
				height: "calc(100vh - 170px + var(--header-offset, 0px))",
			}}
		>
			<aside className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
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
					<div className="flex items-center gap-2">
						{isSuperAdmin ? (
							<select
								className="h-8 rounded-md border bg-background px-2 text-xs"
								value={statusFilter}
								onChange={(event) =>
									setStatusFilter(event.target.value as "ALL" | BugReportStatus)
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
						<BugReportsColumnVisibility />
					</div>
				</div>
				<div className="min-h-0 flex-1">
					<BugReportsDataTable
						data={reports as BugReportRow[]}
						initialSettings={initialSettings}
						isLoading={isLoadingReports}
						isSuperAdmin={isSuperAdmin}
						selectedId={selectedId}
						onSelectReport={(report) => setSelectedId(report.id)}
					/>
				</div>
			</aside>

			<section className="min-h-0 overflow-hidden rounded-md border bg-background">
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
										{
											CAPTURE_TYPE_LABELS[
												(detail.data?.captureType ||
													selectedReport?.captureType ||
													"VIDEO") as BugReportCaptureType
											]
										}
									</Badge>
									{(detail.data?.captureType || selectedReport?.captureType) ===
									"SCREENSHOT" ? null : (
										<>
											<Badge variant="outline">
												{formatBugReportDuration(
													detail.data?.durationMs || selectedReport?.durationMs,
												)}
											</Badge>
											{detail.data?.microphoneEnabled ||
											selectedReport?.microphoneEnabled ? (
												<Badge variant="outline">Mic on</Badge>
											) : (
												<Badge variant="outline">Mic off</Badge>
											)}
										</>
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
										detail.data?.createdAt || selectedReport?.createdAt,
									)}
									{detail.data?.createdBy?.name
										? ` by ${detail.data.createdBy.name}`
										: ""}
								</p>
							</div>
							{isSuperAdmin && detail.data ? (
								<div className="flex items-center gap-2">
									<Label htmlFor="bug-report-status" className="text-xs">
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
												status: event.target.value as BugReportStatus,
											});
										}}
									>
										{BUG_REPORT_STATUS_OPTIONS.map((status) => (
											<option key={status} value={status}>
												{BUG_REPORT_STATUS_LABELS[status]}
											</option>
										))}
									</select>
								</div>
							) : null}
						</div>

						<div className="min-h-0 flex-1 overflow-auto p-4">
							<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
								<div className="space-y-4">
									{detail.data?.recording?.url ? (
										detail.data.captureType === "SCREENSHOT" ? (
											<img
												src={detail.data.recording.url}
												alt="Bug report screenshot"
												className="aspect-video w-full rounded-md border object-contain"
											/>
										) : (
											<video
												src={detail.data.recording.url}
												controls
												className="aspect-video w-full rounded-md border bg-black"
											>
												<track kind="captions" />
											</video>
										)
									) : (
										<div className="flex aspect-video items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
											Evidence unavailable
										</div>
									)}
									{detail.data?.currentUrl ? (
										<div className="rounded-md border p-3 text-sm">
											<div className="mb-1 font-medium">Page URL</div>
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
									{detail.data?.externalIssueStatus ? (
										<div className="rounded-md border p-3 text-sm">
											<div className="mb-1 flex items-center justify-between gap-2">
												<span className="font-medium">External issue</span>
												<Badge variant="outline">
													{String(detail.data.externalIssueStatus)
														.toLowerCase()
														.replaceAll("_", " ")}
												</Badge>
											</div>
											{detail.data.externalIssueUrl ? (
												<a
													href={detail.data.externalIssueUrl}
													target="_blank"
													rel="noreferrer"
													className="break-all text-primary underline-offset-4 hover:underline"
												>
													{detail.data.externalIssueProvider || "Issue"}{" "}
													{detail.data.externalIssueKey || ""}
												</a>
											) : detail.data.externalIssueError ? (
												<p className="text-xs text-muted-foreground">
													{detail.data.externalIssueError}
												</p>
											) : null}
										</div>
									) : null}
								</div>

								<div className="space-y-4">
									<div className="rounded-md border p-3">
										<h3 className="mb-3 text-sm font-semibold">Follow-ups</h3>
										<div className="space-y-3">
											{detail.data?.followUps?.length ? (
												detail.data.followUps.map((item) => (
													<div
														key={item.id}
														className="rounded-md bg-muted/40 p-3 text-sm"
													>
														<div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
															<span>{item.author?.name || "Unknown"}</span>
															<span>{formatDate(item.createdAt)}</span>
														</div>
														<p className="whitespace-pre-wrap">{item.body}</p>
														{item.audio?.url ? (
															<div className="mt-3 space-y-2 rounded-md border bg-background p-2">
																<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
																	<Badge variant="outline">Voice note</Badge>
																	{item.audioDurationMs ? (
																		<span>
																			{formatBugReportDuration(
																				item.audioDurationMs,
																			)}
																		</span>
																	) : null}
																	<span>
																		Transcription:{" "}
																		{String(
																			item.transcriptionStatus ||
																				"NOT_REQUESTED",
																		)
																			.toLowerCase()
																			.replaceAll("_", " ")}
																	</span>
																</div>
																<audio
																	src={item.audio.url}
																	controls
																	className="h-9 w-full"
																>
																	<track kind="captions" />
																</audio>
																{item.transcriptionText ? (
																	<p className="whitespace-pre-wrap text-xs text-muted-foreground">
																		{item.transcriptionText}
																	</p>
																) : null}
															</div>
														) : null}
													</div>
												))
											) : (
												<p className="text-sm text-muted-foreground">
													No follow-ups yet.
												</p>
											)}
										</div>
									</div>

									<div className="rounded-md border p-3">
										<Label htmlFor="bug-follow-up">Add follow-up</Label>
										<Textarea
											id="bug-follow-up"
											className="mt-2"
											value={followUp}
											rows={4}
											onChange={(event) => setFollowUp(event.target.value)}
											placeholder="Add an update, extra detail, or confirmation."
										/>
										<Button
											type="button"
											className="mt-3 w-full"
											disabled={
												!followUp.trim() || addFollowUp.isPending || !selectedId
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
							Select a bug report to view the recording, status, and follow-up
							thread.
						</div>
					</div>
				)}
			</section>
		</div>
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
