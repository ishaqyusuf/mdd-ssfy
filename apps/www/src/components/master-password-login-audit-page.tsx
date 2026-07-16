"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type AuditRow =
	RouterOutputs["masterPasswordLoginAudits"]["list"]["rows"][number];
type PlatformFilter = "ALL" | "WEBSITE" | "MOBILE" | "UNKNOWN";

const platforms: Array<{ value: PlatformFilter; label: string }> = [
	{ value: "ALL", label: "All platforms" },
	{ value: "WEBSITE", label: "Website" },
	{ value: "MOBILE", label: "Mobile" },
	{ value: "UNKNOWN", label: "Unknown" },
];

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "-";
	return format(date, "MMM d, yyyy h:mm a");
}

function userLabel(row: AuditRow) {
	return row.targetUser?.name || row.targetUserName || row.targetUserEmail || "-";
}

function userEmail(row: AuditRow) {
	return row.targetUser?.email || row.targetUserEmail || "";
}

function platformLabel(platform: AuditRow["platform"]) {
	switch (platform) {
		case "WEBSITE":
			return "Website";
		case "MOBILE":
			return "Mobile";
		default:
			return "Unknown";
	}
}

function platformClassName(platform: AuditRow["platform"]) {
	switch (platform) {
		case "WEBSITE":
			return "border-sky-200 bg-sky-50 text-sky-700";
		case "MOBILE":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

function statusClassName(row: AuditRow) {
	return row.clearedAt
		? "border-muted bg-muted/40 text-muted-foreground"
		: "border-amber-200 bg-amber-50 text-amber-700";
}

export function MasterPasswordLoginAuditPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [platform, setPlatform] = useState<PlatformFilter>("ALL");
	const [showCleared, setShowCleared] = useState(false);
	const [page, setPage] = useState(1);
	const size = 25;

	const listInput = useMemo(
		() => ({
			q: search.trim() || undefined,
			platform: platform === "ALL" ? undefined : platform,
			includeCleared: showCleared || undefined,
			page,
			size,
		}),
		[page, platform, search, showCleared],
	);

	const auditsQuery = useQuery(
		trpc.masterPasswordLoginAudits.list.queryOptions(listInput),
	);
	const audits = auditsQuery.data?.rows ?? [];
	const total = auditsQuery.data?.total ?? 0;
	const pageCount = auditsQuery.data?.pageCount ?? 1;

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.masterPasswordLoginAudits.list.queryKey(),
		});
	};

	const clearMutation = useMutation(
		trpc.masterPasswordLoginAudits.clear.mutationOptions({
			async onSuccess(result) {
				await refresh();
				toast({
					title: "Master password login records cleared",
					description: `${result.count.toLocaleString()} record${
						result.count === 1 ? "" : "s"
					} archived.`,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to clear records",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const clearFilteredRecords = () => {
		if (!total) return;
		const confirmed = window.confirm(
			`Clear ${total.toLocaleString()} active master password login record${
				total === 1 ? "" : "s"
			}? Cleared records will be archived and hidden from the default view.`,
		);
		if (!confirmed) return;

		clearMutation.mutate({
			q: search.trim() || undefined,
			platform: platform === "ALL" ? undefined : platform,
		});
	};

	return (
		<div className="space-y-4 px-4 pb-8 md:px-8">
			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle>Master Password Logins</CardTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								{total.toLocaleString()} record{total === 1 ? "" : "s"}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => void refresh()}
								disabled={auditsQuery.isFetching}
							>
								{auditsQuery.isFetching ? (
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.RefreshCw className="mr-2 size-4" />
								)}
								Refresh
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={clearFilteredRecords}
								disabled={!total || clearMutation.isPending}
							>
								{clearMutation.isPending ? (
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.Trash2 className="mr-2 size-4" />
								)}
								Clear
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center">
						<div className="relative min-w-0 flex-1">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Search user, email, IP, browser, or session"
								className="pl-9"
							/>
						</div>
						<Select
							value={platform}
							onValueChange={(value) => {
								setPlatform(value as PlatformFilter);
								setPage(1);
							}}
						>
							<SelectTrigger className="md:w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{platforms.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<label className="flex items-center gap-2 text-sm text-muted-foreground">
							<input
								type="checkbox"
								checked={showCleared}
								onChange={(event) => {
									setShowCleared(event.target.checked);
									setPage(1);
								}}
							/>
							Show cleared
						</label>
					</div>

					<div className="overflow-hidden rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Platform</TableHead>
									<TableHead>IP Address</TableHead>
									<TableHead>Browser</TableHead>
									<TableHead>Session</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{auditsQuery.isPending ? (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											<Icons.Loader2 className="mx-auto mb-2 size-4 animate-spin text-muted-foreground" />
											Loading master password logins...
										</TableCell>
									</TableRow>
								) : audits.length ? (
									audits.map((row) => (
										<TableRow key={row.id}>
											<TableCell>
												<div className="max-w-[240px] space-y-1">
													<p className="truncate text-sm font-medium">
														{userLabel(row)}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{userEmail(row) || "No email snapshot"}
													</p>
												</div>
											</TableCell>
											<TableCell className="min-w-[150px] text-sm">
												{formatDateTime(row.loginAt)}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={platformClassName(row.platform)}
												>
													{platformLabel(row.platform)}
												</Badge>
											</TableCell>
											<TableCell className="font-mono text-xs">
												{row.ipAddress || "-"}
											</TableCell>
											<TableCell>
												<div className="max-w-[260px] space-y-1">
													<p className="truncate text-sm">
														{row.browser || "Unknown browser"}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{row.userAgent || "-"}
													</p>
												</div>
											</TableCell>
											<TableCell className="max-w-[220px] truncate font-mono text-xs">
												{row.sessionId || "-"}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={statusClassName(row)}>
													{row.clearedAt ? "Cleared" : "Active"}
												</Badge>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											No master password login records found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<p className="text-sm text-muted-foreground">
							Page {page} of {pageCount}
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page <= 1 || auditsQuery.isFetching}
								onClick={() => setPage((value) => Math.max(1, value - 1))}
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page >= pageCount || auditsQuery.isFetching}
								onClick={() =>
									setPage((value) => Math.min(pageCount, value + 1))
								}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
