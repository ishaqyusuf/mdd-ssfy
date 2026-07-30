"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

type W9Status =
	RouterInputs["contractorAccounting"]["updateTaxProfile"]["w9Status"];
type ReportKind =
	RouterInputs["contractorAccounting"]["createReportSchedule"]["kind"];

export function ContractorAccountingControlCenterSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, filters, setParams } = useContractorAccountingFilterParams();
	const open = Boolean(params.manageAccounting);
	const periods = useQuery({
		...trpc.contractorAccounting.periods.queryOptions(),
		enabled: open,
	});
	const issues = useQuery({
		...trpc.contractorAccounting.reconciliationIssues.queryOptions({
			statuses: ["OPEN", "REVIEWED"],
			pageSize: 50,
		}),
		enabled: open,
	});
	const runs = useQuery({
		...trpc.contractorAccounting.reportRuns.queryOptions(),
		enabled: open,
	});
	const schedules = useQuery({
		...trpc.contractorAccounting.reportSchedules.queryOptions(),
		enabled: open,
	});
	const taxProfiles = useQuery({
		...trpc.contractorAccounting.taxProfiles.queryOptions(),
		enabled: open,
	});
	const options = useQuery({
		...trpc.contractorAccounting.filterOptions.queryOptions(),
		enabled: open,
	});

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) void setParams({ manageAccounting: null });
			}}
		>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-2xl lg:max-w-4xl"
			>
				<SheetHeader className="border-b px-5 py-4 text-left">
					<SheetTitle>Contractor accounting control center</SheetTitle>
					<SheetDescription>
						Close controls, reconciliation review, report history, schedules,
						and W-9 readiness.
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1">
					<Tabs defaultValue="periods" className="p-5">
						<TabsList className="grid w-full grid-cols-5">
							<TabsTrigger value="periods">Periods</TabsTrigger>
							<TabsTrigger value="issues">Issues</TabsTrigger>
							<TabsTrigger value="reports">Reports</TabsTrigger>
							<TabsTrigger value="schedules">Schedules</TabsTrigger>
							<TabsTrigger value="tax">Tax</TabsTrigger>
						</TabsList>
						<TabsContent value="periods" className="mt-5">
							<PeriodsPanel
								rows={periods.data ?? []}
								loading={periods.isPending}
							/>
						</TabsContent>
						<TabsContent value="issues" className="mt-5">
							<IssuesPanel
								rows={issues.data?.data ?? []}
								loading={issues.isPending}
							/>
						</TabsContent>
						<TabsContent value="reports" className="mt-5">
							<ReportsPanel rows={runs.data ?? []} loading={runs.isPending} />
						</TabsContent>
						<TabsContent value="schedules" className="mt-5">
							<SchedulesPanel
								rows={schedules.data ?? []}
								filters={filters}
								loading={schedules.isPending}
							/>
						</TabsContent>
						<TabsContent value="tax" className="mt-5">
							<TaxPanel
								contractors={options.data?.contractors ?? []}
								profiles={taxProfiles.data ?? []}
								loading={taxProfiles.isPending || options.isPending}
							/>
						</TabsContent>
					</Tabs>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);

	function refresh(
		key: "periods" | "issues" | "reports" | "schedules" | "tax",
	) {
		const queryKey =
			key === "periods"
				? trpc.contractorAccounting.periods.queryKey()
				: key === "issues"
					? trpc.contractorAccounting.reconciliationIssues.queryKey()
					: key === "reports"
						? trpc.contractorAccounting.reportRuns.queryKey()
						: key === "schedules"
							? trpc.contractorAccounting.reportSchedules.queryKey()
							: trpc.contractorAccounting.taxProfiles.queryKey();
		return queryClient.invalidateQueries({ queryKey });
	}

	function PeriodsPanel({
		rows,
		loading,
	}: {
		rows: NonNullable<typeof periods.data>;
		loading: boolean;
	}) {
		const [selectedId, setSelectedId] = useState<string | null>(null);
		const [reason, setReason] = useState("");
		const reopen = useMutation(
			trpc.contractorAccounting.reopenPeriod.mutationOptions({
				async onSuccess() {
					setSelectedId(null);
					setReason("");
					toast({ title: "Accounting period reopened" });
					await refresh("periods");
				},
				onError(error) {
					toast({
						variant: "error",
						title: "Period not reopened",
						description: error.message,
					});
				},
			}),
		);
		if (loading) return <PanelSkeleton />;
		return (
			<div className="space-y-3">
				{rows.length ? (
					rows.map((period) => (
						<div key={period.id} className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">
										{new Date(period.from).toLocaleDateString()} –{" "}
										{new Date(period.toExclusive).toLocaleDateString()}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{period.timezone} · {period.events.length} audit event
										{period.events.length === 1 ? "" : "s"}
									</p>
								</div>
								<Badge
									variant={period.status === "CLOSED" ? "secondary" : "outline"}
								>
									{period.status}
								</Badge>
							</div>
							{period.status === "CLOSED" ? (
								selectedId === period.id ? (
									<div className="mt-4 space-y-2">
										<Textarea
											value={reason}
											onChange={(event) => setReason(event.target.value)}
											placeholder="Required reopen reason"
										/>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="destructive"
												disabled={reason.trim().length < 3 || reopen.isPending}
												onClick={() =>
													reopen.mutate({
														periodId: period.id,
														reason,
													})
												}
											>
												Reopen period
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => setSelectedId(null)}
											>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<Button
										size="sm"
										variant="outline"
										className="mt-3"
										onClick={() => setSelectedId(period.id)}
									>
										Request reopen
									</Button>
								)
							) : null}
						</div>
					))
				) : (
					<EmptyPanel text="No accounting periods have been closed." />
				)}
			</div>
		);
	}

	function IssuesPanel({
		rows,
		loading,
	}: {
		rows: NonNullable<typeof issues.data>["data"];
		loading: boolean;
	}) {
		const [note, setNote] = useState("");
		const [selectedId, setSelectedId] = useState<string | null>(null);
		const review = useMutation(
			trpc.contractorAccounting.reviewIssue.mutationOptions({
				async onSuccess() {
					setSelectedId(null);
					setNote("");
					toast({ title: "Reconciliation issue reviewed" });
					await refresh("issues");
				},
				onError(error) {
					toast({
						variant: "error",
						title: "Issue not updated",
						description: error.message,
					});
				},
			}),
		);
		if (loading) return <PanelSkeleton />;
		return (
			<div className="space-y-3">
				{rows.length ? (
					rows.map((issue) => (
						<div key={issue.id} className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">
										{issue.code.replaceAll("_", " ")}
									</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{issue.message}
									</p>
								</div>
								<Badge variant="outline">{issue.status}</Badge>
							</div>
							{selectedId === issue.id ? (
								<div className="mt-4 space-y-2">
									<Textarea
										value={note}
										onChange={(event) => setNote(event.target.value)}
										placeholder="Review or resolution note"
									/>
									<div className="flex gap-2">
										<Button
											size="sm"
											disabled={note.trim().length < 3 || review.isPending}
											onClick={() =>
												review.mutate({
													id: issue.id,
													status: "REVIEWED",
													note,
												})
											}
										>
											Mark reviewed
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={note.trim().length < 3 || review.isPending}
											onClick={() =>
												review.mutate({
													id: issue.id,
													status: "RESOLVED",
													note,
												})
											}
										>
											Resolve
										</Button>
									</div>
								</div>
							) : (
								<Button
									size="sm"
									variant="outline"
									className="mt-3"
									onClick={() => setSelectedId(issue.id)}
								>
									Review
								</Button>
							)}
						</div>
					))
				) : (
					<EmptyPanel text="No open reconciliation issues." />
				)}
			</div>
		);
	}

	function ReportsPanel({
		rows,
		loading,
	}: {
		rows: NonNullable<typeof runs.data>;
		loading: boolean;
	}) {
		if (loading) return <PanelSkeleton />;
		return (
			<div className="space-y-3">
				{rows.length ? (
					rows.map((run) => (
						<div
							key={run.id}
							className="flex items-center justify-between gap-3 rounded-xl border p-4"
						>
							<div>
								<p className="font-medium">
									{run.kind.replaceAll("_", " ")} · {run.format}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{new Date(run.createdAt).toLocaleString()} · {run.status}
								</p>
								{run.error ? (
									<p className="mt-1 text-xs text-destructive">{run.error}</p>
								) : null}
							</div>
							{run.outputUrl ? (
								<Button asChild size="icon" variant="outline">
									<a href={run.outputUrl} target="_blank" rel="noreferrer">
										<ExternalLink className="size-4" />
									</a>
								</Button>
							) : (
								<Badge variant="outline">{run.status}</Badge>
							)}
						</div>
					))
				) : (
					<EmptyPanel text="No reports have been generated." />
				)}
			</div>
		);
	}

	function SchedulesPanel({
		rows,
		filters: activeFilters,
		loading,
	}: {
		rows: NonNullable<typeof schedules.data>;
		filters: typeof filters;
		loading: boolean;
	}) {
		const [name, setName] = useState("");
		const [kind, setKind] = useState<ReportKind>("CONSOLIDATED");
		const [cron, setCron] = useState("0 8 1 * *");
		const [recipients, setRecipients] = useState("");
		const create = useMutation(
			trpc.contractorAccounting.createReportSchedule.mutationOptions({
				async onSuccess() {
					setName("");
					setRecipients("");
					toast({ title: "Report schedule created" });
					await refresh("schedules");
				},
				onError(error) {
					toast({
						variant: "error",
						title: "Schedule not created",
						description: error.message,
					});
				},
			}),
		);
		return (
			<div className="space-y-5">
				<form
					className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({
							name,
							kind,
							format: kind === "RECONCILIATION" ? "CSV" : "XLSX",
							cron,
							timezone: activeFilters.timezone,
							filters: {
								...activeFilters,
								includeEntries: false,
							} as never,
							recipients: recipients
								.split(",")
								.map((item) => item.trim())
								.filter(Boolean),
						});
					}}
				>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Monthly contractor close"
					/>
					<Select
						value={kind}
						onValueChange={(value) => setKind(value as ReportKind)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[
								"CONSOLIDATED",
								"AGING",
								"RECONCILIATION",
								"ADJUSTMENT_REGISTER",
								"TAX_READINESS",
							].map((value) => (
								<SelectItem key={value} value={value}>
									{value.replaceAll("_", " ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={cron}
						onChange={(event) => setCron(event.target.value)}
						placeholder="0 8 1 * *"
					/>
					<Input
						value={recipients}
						onChange={(event) => setRecipients(event.target.value)}
						placeholder="finance@example.com, owner@example.com"
					/>
					<Button
						type="submit"
						className="sm:col-span-2"
						disabled={!name || !recipients || create.isPending}
					>
						{create.isPending ? "Saving…" : "Create schedule"}
					</Button>
				</form>
				{loading ? (
					<PanelSkeleton />
				) : rows.length ? (
					rows.map((schedule) => (
						<div key={schedule.id} className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{schedule.name}</p>
									<p className="mt-1 font-mono text-xs text-muted-foreground">
										{schedule.cron} · {schedule.timezone}
									</p>
								</div>
								<Badge variant={schedule.enabled ? "secondary" : "outline"}>
									{schedule.enabled ? "ACTIVE" : "PAUSED"}
								</Badge>
							</div>
						</div>
					))
				) : (
					<EmptyPanel text="No scheduled reports." />
				)}
			</div>
		);
	}

	function TaxPanel({
		contractors,
		profiles,
		loading,
	}: {
		contractors: Array<{ id: string; name: string }>;
		profiles: NonNullable<typeof taxProfiles.data>;
		loading: boolean;
	}) {
		const [contractorId, setContractorId] = useState("");
		const [legalName, setLegalName] = useState("");
		const [w9Status, setW9Status] = useState<W9Status>("NOT_REQUESTED");
		const [tinLastFour, setTinLastFour] = useState("");
		const update = useMutation(
			trpc.contractorAccounting.updateTaxProfile.mutationOptions({
				async onSuccess() {
					toast({ title: "Tax readiness updated" });
					await refresh("tax");
				},
				onError(error) {
					toast({
						variant: "error",
						title: "Tax profile not updated",
						description: error.message,
					});
				},
			}),
		);
		return (
			<div className="space-y-5">
				<form
					className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						update.mutate({
							contractorId: Number(contractorId),
							legalName: legalName || null,
							w9Status,
							tinLastFour: tinLastFour || null,
						});
					}}
				>
					<Select value={contractorId} onValueChange={setContractorId}>
						<SelectTrigger>
							<SelectValue placeholder="Select contractor" />
						</SelectTrigger>
						<SelectContent>
							{contractors.map((contractor) => (
								<SelectItem key={contractor.id} value={contractor.id}>
									{contractor.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={legalName}
						onChange={(event) => setLegalName(event.target.value)}
						placeholder="Legal name"
					/>
					<Select
						value={w9Status}
						onValueChange={(value) => setW9Status(value as W9Status)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[
								"NOT_REQUESTED",
								"REQUESTED",
								"RECEIVED",
								"VERIFIED",
								"EXPIRED",
							].map((value) => (
								<SelectItem key={value} value={value}>
									{value.replaceAll("_", " ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={tinLastFour}
						onChange={(event) =>
							setTinLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))
						}
						placeholder="TIN last four"
						inputMode="numeric"
					/>
					<Button
						type="submit"
						className="sm:col-span-2"
						disabled={!contractorId || update.isPending}
					>
						{update.isPending ? "Saving…" : "Save tax profile"}
					</Button>
				</form>
				{loading ? (
					<PanelSkeleton />
				) : profiles.length ? (
					profiles.map((profile) => (
						<div
							key={profile.id}
							className="flex items-center justify-between gap-3 rounded-xl border p-4"
						>
							<div>
								<p className="font-medium">
									{profile.contractor?.name ||
										`Contractor #${profile.contractorId}`}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{profile.legalName || "Legal name not recorded"} · TIN{" "}
									{profile.tinLastFour
										? `•••• ${profile.tinLastFour}`
										: "missing"}
								</p>
							</div>
							<Badge variant="outline">
								{profile.w9Status.replaceAll("_", " ")}
							</Badge>
						</div>
					))
				) : (
					<EmptyPanel text="No contractor tax profiles have been recorded." />
				)}
			</div>
		);
	}
}

function PanelSkeleton() {
	return (
		<div className="space-y-3">
			{["one", "two", "three"].map((key) => (
				<div key={key} className="h-24 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	);
}

function EmptyPanel({ text }: { text: string }) {
	return (
		<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
			{text}
		</div>
	);
}
