"use client";

import { Icons } from "@gnd/ui/icons";

import { JobOverviewModal } from "@/components/modals/job-overview";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { generatePayrollReport, printSelectedJobs } from "@/lib/job-print";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const paymentMethods = ["Check", "ACH", "Zelle", "Cash"] as const;
const statusOptions = [
	{ label: "All concerning jobs", value: "all" },
	{ label: "Pending review", value: "pending-review" },
	{ label: "Ready to pay", value: "ready-to-pay" },
	{ label: "Approved", value: "approved" },
	{ label: "Completed", value: "completed" },
	{ label: "Payment cancelled", value: "payment-cancelled" },
] as const;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function canSelectJob(job: { paymentStage?: string | null }) {
	return !!job.paymentStage;
}

function canSelectForReview(job: { paymentStage?: string | null }) {
	return job.paymentStage === "pending-review";
}

function requiresAutoApproval(job: { status?: string | null }) {
	return !READY_TO_PAY_STATUSES.has(String(job.status || ""));
}

const READY_TO_PAY_STATUSES = new Set(["Approved", "Completed"]);

function getInsuranceTone(state?: string | null) {
	switch (state) {
		case "valid":
			return "default" as const;
		case "expiring_soon":
			return "secondary" as const;
		default:
			return "destructive" as const;
	}
}

export function PaymentPortal() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setParams } = useJobParams();
	const searchParams = useSearchParams();
	const [contractorSearch, setContractorSearch] = useState("");
	const [selectedContractorId, setSelectedContractorId] = useState<
		number | null
	>(null);
	const [jobSearch, setJobSearch] = useState("");
	const [status, setStatus] =
		useState<(typeof statusOptions)[number]["value"]>("all");
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
	const [paymentMethod, setPaymentMethod] =
		useState<(typeof paymentMethods)[number]>("Check");
	const [checkNo, setCheckNo] = useState("");

	const dashboardQuery = useQuery(
		trpc.jobs.paymentDashboard.queryOptions({
			q: contractorSearch || undefined,
		}),
	);

	const contractors = dashboardQuery.data?.contractors || [];

	useEffect(() => {
		if (!contractors.length) {
			setSelectedContractorId(null);
			return;
		}

		const hasSelectedContractor = contractors.some(
			(item) => item.id === selectedContractorId,
		);

		const searchParamContractorId = Number(
			searchParams.get("contractorId") || 0,
		);
		const preferredContractorId = contractors.some(
			(item) => item.id === searchParamContractorId,
		)
			? searchParamContractorId
			: contractors[0]?.id || null;

		if (!hasSelectedContractor) {
			setRowSelection({});
			setSelectedContractorId(preferredContractorId);
		}
	}, [contractors, searchParams, selectedContractorId]);

	const portalQuery = useQuery(
		trpc.jobs.paymentPortal.queryOptions(
			{
				userId: selectedContractorId || 0,
				q: jobSearch || undefined,
				status,
			},
			{
				enabled: !!selectedContractorId,
			},
		),
	);

	const portal = portalQuery.data;
	const jobs = portal?.jobs || [];
	const isPendingReviewMode = status === "pending-review";
	const selectedJobIds = useMemo(
		() =>
			Object.entries(rowSelection)
				.filter(([, selected]) => !!selected)
				.map(([key]) => Number(key)),
		[rowSelection],
	);
	const selectedJobs = useMemo(
		() => jobs.filter((job) => selectedJobIds.includes(job.id)),
		[jobs, selectedJobIds],
	);
	const selectedTotal = useMemo(
		() =>
			Number(
				selectedJobs
					.reduce((sum, job) => sum + Number(job.amount || 0), 0)
					.toFixed(2),
			),
		[selectedJobs],
	);
	const chargePercentage = Number(portal?.contractor.chargePercentage || 0);
	const discountValue = Number(
		(selectedTotal * (chargePercentage / 100)).toFixed(2),
	);
	const totalPayout = Number((selectedTotal - discountValue).toFixed(2));
	const createPaymentMutation = useMutation(
		trpc.jobs.createPaymentPortal.mutationOptions({
			onSuccess: async (data) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentDashboard.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentPortal.queryKey({
							userId: selectedContractorId || 0,
							q: jobSearch || undefined,
							status,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.infiniteQueryKey(),
					}),
				]);

				setRowSelection({});
				setCheckNo("");

				toast({
					title: "Payment portal completed",
					description: `Payment batch #${data.id} was created for ${formatCurrency(
						data.totalPayout,
					)}.`,
				});
			},
		}),
	);

	const reviewMutation = useMutation(
		trpc.jobs.jobReview.mutationOptions({
			onSuccess: async (_, variables) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentDashboard.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentPortal.queryKey({
							userId: selectedContractorId || 0,
							q: jobSearch || undefined,
							status,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.infiniteQueryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.overview.queryKey({
							jobId: variables.jobId,
						}),
					}),
				]);

				setRowSelection((current) => {
					const next = { ...current };
					delete next[String(variables.jobId)];
					return next;
				});

				toast({
					title:
						variables.action === "submit"
							? "Job marked as submitted"
							: variables.action === "approve"
								? "Job approved"
								: "Job rejected",
					variant: variables.action === "reject" ? "destructive" : "success",
				});
			},
			onError: () => {
				toast({
					title: "Failed to update job status. Please try again.",
					variant: "destructive",
				});
			},
		}),
	);

	const canSubmitPayment =
		!!selectedContractorId && selectedJobIds.length > 0 && totalPayout >= 0;
	const pendingReviewJobs =
		portal?.jobs.filter((job) => job.paymentStage === "pending-review")
			.length || 0;
	const readyToPayJobs =
		portal?.jobs.filter((job) => job.paymentStage === "ready-to-pay").length ||
		0;
	const selectedPendingReviewJobs = selectedJobs.filter((job) =>
		canSelectForReview(job),
	);
	const selectionWarnings = useMemo(() => {
		const warningMap = new Map<
			string,
			{ status: string; count: number; jobIds: number[] }
		>();

		for (const job of selectedJobs) {
			if (!requiresAutoApproval(job)) continue;
			const status = String(job.status || "Unknown");
			const current = warningMap.get(status) || {
				status,
				count: 0,
				jobIds: [],
			};
			current.count += 1;
			current.jobIds.push(job.id);
			warningMap.set(status, current);
		}

		return Array.from(warningMap.values()).sort((left, right) =>
			left.status.localeCompare(right.status),
		);
	}, [selectedJobs]);

	const markableJobs = jobs.filter((job) =>
		isPendingReviewMode ? canSelectForReview(job) : canSelectJob(job),
	);

	const runBulkReview = (action: "approve" | "reject") => {
		for (const job of selectedPendingReviewJobs) {
			reviewMutation.mutate({
				action,
				jobId: job.id,
				note:
					action === "approve"
						? "Approved from payment portal."
						: "Rejected from payment portal.",
			});
		}
	};

	const handleRowReview = (jobId: number, action: "approve" | "reject") => {
		reviewMutation.mutate({
			action,
			jobId,
			note:
				action === "approve"
					? "Approved from payment portal."
					: "Rejected from payment portal.",
		});
	};

	const handleMarkSubmitted = (jobId: number) => {
		reviewMutation.mutate({
			action: "submit",
			jobId,
			note: "Marked as submitted from payment portal.",
		});
	};

	return (
		<div className="flex flex-col gap-6 py-6 pb-8">
			<Card className="border-dashed bg-muted/10">
				<CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<p className="text-sm font-semibold text-foreground">
							Generate full payroll report
						</p>
						<p className="text-sm text-muted-foreground">
							Create a PDF summary of all unpaid jobs across contractors,
							starting with the overall totals before the
							contractor-by-contractor breakdown.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="rounded-xl border bg-background px-4 py-2 text-sm">
							<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
								Unpaid Jobs
							</p>
							<p className="mt-1 font-semibold text-foreground">
								{dashboardQuery.data?.summary.pendingJobs || 0}
							</p>
						</div>
						<div className="rounded-xl border bg-background px-4 py-2 text-sm">
							<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
								Total Payable
							</p>
							<p className="mt-1 font-semibold text-foreground">
								{formatCurrency(dashboardQuery.data?.summary.totalPay)}
							</p>
						</div>
						<Button
							onClick={() => generatePayrollReport()}
							disabled={dashboardQuery.isPending || !contractors.length}
						>
							<Icons.Printer data-icon="inline-start" />
							Generate Payroll Report
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="grid min-w-0 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px] xl:items-start">
				<Card className="hidden overflow-hidden xl:sticky xl:top-6 xl:flex xl:h-[calc(100vh-7rem)] xl:flex-col">
					<CardHeader className="gap-4 border-b bg-muted/30">
						<div>
							<CardTitle>Contractors</CardTitle>
							<CardDescription>
								Choose a contractor to inspect pending review and ready-to-pay
								jobs in one place.
							</CardDescription>
						</div>
						<div className="relative">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={contractorSearch}
								onChange={(event) => setContractorSearch(event.target.value)}
								placeholder="Search contractor"
								className="pl-9"
							/>
						</div>
					</CardHeader>
					<CardContent className="p-0 xl:flex-1 xl:min-h-0">
						{dashboardQuery.isPending ? (
							<div className="flex flex-col gap-3 p-4">
								{["a", "b", "c", "d", "e"].map((item) => (
									<Skeleton key={item} className="h-24 rounded-2xl" />
								))}
							</div>
						) : !contractors.length ? (
							<div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center">
								<p className="text-sm font-medium text-foreground">
									No contractors are waiting for payment.
								</p>
								<p className="text-sm text-muted-foreground">
									Once approved jobs are unpaid, they will show up here
									automatically.
								</p>
							</div>
						) : (
							<ScrollArea className="h-[560px] xl:h-full">
								<div className="flex flex-col gap-2 p-3">
									{contractors.map((contractor) => {
										const isActive = contractor.id === selectedContractorId;

										return (
											<button
												type="button"
												key={contractor.id}
												onClick={() => {
													setRowSelection({});
													setSelectedContractorId(contractor.id);
												}}
												className={cn(
													"flex w-full min-w-0 max-w-full overflow-hidden box-border flex-col gap-2 rounded-xl border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40",
													isActive &&
														"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
												)}
											>
												<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
													<div className="min-w-0 flex-1">
														<p className="max-w-full truncate text-sm font-medium text-foreground">
															{contractor.name}
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{contractor.email || "No email on file"}
														</p>
													</div>
													<Badge
														variant={getInsuranceTone(
															contractor.insurance.state,
														)}
														className="w-fit max-w-full shrink-0"
													>
														{contractor.insurance.state.replace("_", " ")}
													</Badge>
												</div>
												<div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
													<span>
														{contractor.pendingReviewCount} pending review
													</span>
													<span className="text-border">•</span>
													<span>{contractor.readyToPayCount} ready to pay</span>
												</div>
												<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
													<p className="min-w-0 text-[11px] text-muted-foreground break-words">
														{contractor.lastProjectTitle
															? `Recent project: ${contractor.lastProjectTitle}`
															: "No recent project yet"}
													</p>
													<p className="shrink-0 text-sm font-semibold text-foreground">
														{formatCurrency(contractor.totalPay)}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							</ScrollArea>
						)}
					</CardContent>
				</Card>

				<Card className="min-w-0 overflow-hidden xl:flex xl:h-[calc(100vh-7rem)] xl:flex-col">
					<CardHeader className="gap-4 border-b bg-muted/20">
						{portal ? (
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
									<div>
										<CardTitle>{portal.contractor.name}</CardTitle>
										<CardDescription>
											{portal.contractor.email || "No email on file"}
										</CardDescription>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant={getInsuranceTone(
												portal.contractor.insurance.state,
											)}
										>
											{portal.contractor.insurance.message}
										</Badge>
										<Badge variant="secondary">
											{formatCurrency(portal.contractor.pendingBill)} pending
										</Badge>
									</div>
								</div>
								<div className="grid gap-3 md:grid-cols-3">
									<MiniInfoCard
										label="Pending review"
										value={String(portal.contractor.pendingReviewCount)}
									/>
									<MiniInfoCard
										label="Ready to pay"
										value={String(portal.contractor.readyToPayCount)}
									/>
									<MiniInfoCard
										label="Total pay"
										value={formatCurrency(portal.contractor.totalPay)}
									/>
								</div>
							</div>
						) : (
							<div>
								<CardTitle>Portal workspace</CardTitle>
								<CardDescription>
									Select a contractor to load payable jobs and payout controls.
								</CardDescription>
							</div>
						)}
					</CardHeader>

					<CardContent className="p-0 xl:flex-1 xl:min-h-0">
						<ScrollArea className="h-full">
							<div className="flex flex-col gap-4 p-4 md:p-6">
								<div className="xl:hidden">
									<FieldBlock label="Contractor">
										<Select
											value={
												selectedContractorId ? String(selectedContractorId) : ""
											}
											onValueChange={(value) => {
												setRowSelection({});
												setSelectedContractorId(Number(value));
											}}
											disabled={!contractors.length}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select contractor" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{contractors.map((contractor) => (
														<SelectItem
															key={contractor.id}
															value={String(contractor.id)}
														>
															{contractor.name}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</FieldBlock>
								</div>
								<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
									<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
										<div className="relative">
											<Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												value={jobSearch}
												onChange={(event) => setJobSearch(event.target.value)}
												placeholder="Filter jobs, project, lot, or model"
												className="pl-9"
												disabled={!selectedContractorId}
											/>
										</div>
										<Select
											value={status}
											onValueChange={(value) =>
												setStatus(
													value as (typeof statusOptions)[number]["value"],
												)
											}
											disabled={!selectedContractorId}
										>
											<SelectTrigger>
												<SelectValue placeholder="Filter status" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{statusOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>

									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												printSelectedJobs({
													jobIds: selectedJobIds,
													context: "payment-portal",
												})
											}
											disabled={!selectedJobIds.length}
										>
											<Icons.Printer data-icon="inline-start" />
											Print Selected
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setRowSelection(
													Object.fromEntries(
														markableJobs.map((job) => [String(job.id), true]),
													),
												)
											}
											disabled={!markableJobs.length}
										>
											Mark all
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setRowSelection({})}
											disabled={!selectedJobIds.length}
										>
											Clear
										</Button>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border bg-muted/10 px-4 py-3">
									<InlineMetric
										label="Pending review"
										value={String(pendingReviewJobs)}
									/>
									<InlineMetric
										label="Ready to pay"
										value={String(readyToPayJobs)}
									/>
									<InlineMetric
										label="Selected payout"
										value={formatCurrency(selectedTotal)}
										emphasis
									/>
								</div>

								{isPendingReviewMode && selectedPendingReviewJobs.length > 0 ? (
									<div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-sm font-medium text-foreground">
												{selectedPendingReviewJobs.length} pending review job
												{selectedPendingReviewJobs.length === 1 ? "" : "s"}{" "}
												marked
											</p>
											<p className="text-sm text-muted-foreground">
												Approve or reject the marked submissions directly from
												this view.
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												onClick={() => runBulkReview("reject")}
												disabled={reviewMutation.isPending}
											>
												<Icons.XCircle data-icon="inline-start" />
												Reject Marked
											</Button>
											<Button
												onClick={() => runBulkReview("approve")}
												disabled={reviewMutation.isPending}
											>
												<Icons.CheckCircle2 data-icon="inline-start" />
												Approve Marked
											</Button>
										</div>
									</div>
								) : null}

								{portalQuery.isPending ? (
									<div className="grid gap-3">
										<Skeleton className="h-16 rounded-2xl" />
										<Skeleton className="h-16 rounded-2xl" />
										<Skeleton className="h-16 rounded-2xl" />
									</div>
								) : !selectedContractorId ? (
									<EmptyPortalState text="Select a contractor to open the payment portal." />
								) : !jobs.length ? (
									<EmptyPortalState text="No payable jobs match the current filters." />
								) : (
									<div className="flex flex-col gap-3">
										{jobs.map((job) => (
											<JobListItem
												key={job.id}
												job={job}
												checked={!!rowSelection[String(job.id)]}
												isPendingReviewMode={isPendingReviewMode}
												isReviewPending={reviewMutation.isPending}
												onOpen={() => {
													setParams({
														openJobId: job.id,
													});
												}}
												onCheckedChange={(value) =>
													setRowSelection((current) => ({
														...current,
														[String(job.id)]: value,
													}))
												}
												onMarkSubmitted={() => handleMarkSubmitted(job.id)}
												onApprove={() => handleRowReview(job.id, "approve")}
												onReject={() => handleRowReview(job.id, "reject")}
											/>
										))}
									</div>
								)}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>

				<div className="xl:sticky xl:top-6 xl:h-[calc(100vh-7rem)]">
					<PaymentSidebar
						selectedJobIds={selectedJobIds}
						selectedTotal={selectedTotal}
						chargePercentage={chargePercentage}
						discountValue={discountValue}
						totalPayout={totalPayout}
						paymentMethod={paymentMethod}
						setPaymentMethod={setPaymentMethod}
						checkNo={checkNo}
						setCheckNo={setCheckNo}
						canSubmitPayment={canSubmitPayment}
						isPendingReviewMode={isPendingReviewMode}
						selectedPendingReviewCount={selectedPendingReviewJobs.length}
						selectionWarnings={selectionWarnings}
						isSubmitting={createPaymentMutation.isPending}
						onRemoveWarningJobs={(jobIds) =>
							setRowSelection((current) => {
								const next = { ...current };
								for (const jobId of jobIds) {
									delete next[String(jobId)];
								}
								return next;
							})
						}
						onSubmit={() => {
							if (!selectedContractorId) return;

							createPaymentMutation.mutate({
								userId: selectedContractorId,
								jobIds: selectedJobIds,
								adjustment: 0,
								discount: discountValue,
								paymentMethod,
								checkNo: checkNo || undefined,
							});
						}}
					/>
				</div>
			</div>

			<JobOverviewModal />
		</div>
	);
}

function MiniInfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border bg-background p-4">
			<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-base font-semibold text-foreground">{value}</p>
		</div>
	);
}

function InlineMetric({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div className="flex items-baseline gap-2">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p
				className={cn(
					"text-sm font-medium text-foreground",
					emphasis && "text-base font-semibold",
				)}
			>
				{value}
			</p>
		</div>
	);
}

function JobListItem({
	job,
	checked,
	isPendingReviewMode,
	isReviewPending,
	onOpen,
	onCheckedChange,
	onMarkSubmitted,
	onApprove,
	onReject,
}: {
	job: {
		id: number;
		title?: string | null;
		subtitle?: string | null;
		project?: { title?: string | null } | null;
		home?: { lotBlock?: string | null; modelName?: string | null } | null;
		status?: string | null;
		amount?: number | null;
		createdAt?: Date | string | null;
		paymentStage?: string | null;
	};
	checked: boolean;
	isPendingReviewMode: boolean;
	isReviewPending: boolean;
	onOpen: () => void;
	onCheckedChange: (value: boolean) => void;
	onMarkSubmitted: () => void;
	onApprove: () => void;
	onReject: () => void;
}) {
	const canReviewThisJob = canSelectForReview(job);
	const canPayThisJob = canSelectJob(job);
	const canMarkSubmitted = job.status !== "Submitted" && job.status !== "Paid";

	return (
		<button
			type="button"
			onClick={onOpen}
			className="w-full min-w-0 rounded-2xl border bg-background p-4 text-left transition hover:border-primary/30 hover:bg-muted/20"
		>
			<div className="flex items-start gap-3">
				<Checkbox
					checked={checked}
					disabled={isPendingReviewMode ? !canReviewThisJob : !canPayThisJob}
					onClick={(event) => event.stopPropagation()}
					onCheckedChange={(value) => onCheckedChange(!!value)}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
								<p className="truncate font-medium text-foreground">
									{job.title}
									{job.subtitle ? ` - ${job.subtitle}` : ""}
								</p>
								<Badge variant="secondary" className="w-fit shrink-0">
									{job.status}
								</Badge>
							</div>
							<p className="truncate text-sm text-muted-foreground">
								{job.project?.title || "Unknown project"}
							</p>
						</div>
						<p className="shrink-0 text-base font-semibold text-foreground">
							{formatCurrency(job.amount)}
						</p>
					</div>

					<div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
						<p className="min-w-0 truncate">
							{job.home?.lotBlock || "No lot"} •{" "}
							{job.home?.modelName || "No model"}
						</p>
						<p className="text-xs">
							Created{" "}
							{job.createdAt
								? format(new Date(job.createdAt), "MMM d, yyyy")
								: "N/A"}
						</p>
					</div>

					<div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<p className="text-xs text-muted-foreground">
							{job.paymentStage === "pending-review"
								? "This job is still pending review. Paying it will approve it automatically."
								: job.paymentStage === "ready-to-pay"
									? "Ready to include in the next payout batch."
									: "This job is unpaid. Paying it will approve it automatically."}
						</p>
						{isPendingReviewMode && canReviewThisJob ? (
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="secondary"
									onClick={(event) => {
										event.stopPropagation();
										onMarkSubmitted();
									}}
									disabled={isReviewPending || !canMarkSubmitted}
								>
									Mark submitted
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={(event) => {
										event.stopPropagation();
										onReject();
									}}
									disabled={isReviewPending}
								>
									Reject
								</Button>
								<Button
									size="sm"
									onClick={(event) => {
										event.stopPropagation();
										onApprove();
									}}
									disabled={isReviewPending}
								>
									Approve
								</Button>
							</div>
						) : canMarkSubmitted ? (
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="secondary"
									onClick={(event) => {
										event.stopPropagation();
										onMarkSubmitted();
									}}
									disabled={isReviewPending}
								>
									Mark submitted
								</Button>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</button>
	);
}

function EmptyPortalState({ text }: { text: string }) {
	return (
		<div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
			<Icons.ShieldAlert className="h-8 w-8 text-muted-foreground" />
			<p className="font-medium text-foreground">{text}</p>
			<p className="max-w-md text-sm text-muted-foreground">
				Click any job row once the list loads to open its overview before you
				finalize the payout.
			</p>
		</div>
	);
}

function FieldBlock({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			{children}
		</div>
	);
}

function PaymentSidebar({
	selectedJobIds,
	selectedTotal,
	chargePercentage,
	discountValue,
	totalPayout,
	paymentMethod,
	setPaymentMethod,
	checkNo,
	setCheckNo,
	canSubmitPayment,
	isPendingReviewMode,
	selectedPendingReviewCount,
	selectionWarnings,
	isSubmitting,
	onRemoveWarningJobs,
	onSubmit,
}: {
	selectedJobIds: number[];
	selectedTotal: number;
	chargePercentage: number;
	discountValue: number;
	totalPayout: number;
	paymentMethod: (typeof paymentMethods)[number];
	setPaymentMethod: (value: (typeof paymentMethods)[number]) => void;
	checkNo: string;
	setCheckNo: (value: string) => void;
	canSubmitPayment: boolean;
	isPendingReviewMode: boolean;
	selectedPendingReviewCount: number;
	selectionWarnings: {
		status: string;
		count: number;
		jobIds: number[];
	}[];
	isSubmitting: boolean;
	onRemoveWarningJobs: (jobIds: number[]) => void;
	onSubmit: () => void;
}) {
	return (
		<Card className="overflow-hidden xl:flex xl:h-full xl:flex-col">
			<CardHeader className="border-b bg-muted/20">
				<CardTitle>Payout Summary</CardTitle>
				<CardDescription>
					{isPendingReviewMode
						? "Review mode is active. Selected jobs can still be paid, and any non-approved items will be approved automatically during payout."
						: "Finalize payment details for the selected unpaid jobs."}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0 xl:flex-1 xl:min-h-0">
				<ScrollArea className="max-h-[520px] xl:h-full">
					<div className="grid gap-4 p-4 md:p-5">
						<div className="rounded-2xl border bg-muted/20 p-4">
							<div className="flex items-baseline justify-between gap-3">
								<div>
									<p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
										Total payout
									</p>
									<p className="mt-1 text-2xl font-semibold text-foreground">
										{formatCurrency(totalPayout)}
									</p>
								</div>
								<div className="text-right text-xs text-muted-foreground">
									<p>
										{selectedJobIds.length} job
										{selectedJobIds.length === 1 ? "" : "s"}
									</p>
									<p>{chargePercentage.toFixed(0)}% discount</p>
								</div>
							</div>
							<div className="mt-4 grid gap-2 text-sm">
								<CompactSummaryRow
									label="Subtotal"
									value={formatCurrency(selectedTotal)}
								/>
								<CompactSummaryRow
									label={`Discount (${chargePercentage.toFixed(0)}%)`}
									value={`- ${formatCurrency(discountValue)}`}
								/>
								<div className="h-px bg-border" />
								<CompactSummaryRow
									label="Payout"
									value={formatCurrency(totalPayout)}
									emphasis
								/>
							</div>
						</div>

						<div className="grid gap-3">
							<FieldBlock label="Payment method">
								<Select
									value={paymentMethod}
									onValueChange={(value) =>
										setPaymentMethod(value as (typeof paymentMethods)[number])
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{paymentMethods.map((method) => (
												<SelectItem key={method} value={method}>
													{method}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</FieldBlock>

							<FieldBlock label="Check no">
								<Input
									value={checkNo}
									onChange={(event) => setCheckNo(event.target.value)}
									placeholder="Optional"
								/>
							</FieldBlock>
						</div>

						{selectionWarnings.length ? (
							<div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
								<p className="font-semibold">Warning</p>
								<div className="mt-3 grid gap-2">
									{selectionWarnings.map((warning) => (
										<div
											key={warning.status}
											className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white/70 px-3 py-2"
										>
											<p className="flex-1 leading-6">
												{warning.count === 1
													? `A job with status "${warning.status}" is part of selection, proceeding will mark this job as approved.`
													: `${warning.count} jobs with status "${warning.status}" are part of selection, proceeding will mark these jobs as approved.`}
											</p>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => onRemoveWarningJobs(warning.jobIds)}
											>
												Remove
											</Button>
										</div>
									))}
								</div>
							</div>
						) : null}

						{isPendingReviewMode ? (
							<div className="rounded-2xl border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
								{selectedPendingReviewCount > 0
									? `${selectedPendingReviewCount} marked job${selectedPendingReviewCount === 1 ? "" : "s"} are pending review. You can still pay them, but they will be approved automatically as part of payout.`
									: "Pending review mode is primarily for approval decisions, but selected jobs can still be included in payout."}
							</div>
						) : null}

						<Button
							size="lg"
							onClick={onSubmit}
							disabled={!canSubmitPayment || isSubmitting}
							className="w-full"
						>
							<Icons.BanknoteArrowDown data-icon="inline-start" />
							{isSubmitting ? "Creating payment..." : "Make payment"}
						</Button>
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function CompactSummaryRow({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<p
				className={cn(
					"text-sm text-muted-foreground",
					emphasis && "font-medium text-foreground",
				)}
			>
				{label}
			</p>
			<p
				className={cn(
					"text-sm font-medium text-foreground",
					emphasis && "text-base font-semibold",
				)}
			>
				{value}
			</p>
		</div>
	);
}
