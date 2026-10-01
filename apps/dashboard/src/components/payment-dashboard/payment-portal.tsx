"use client";

import { DataTable as PaymentPortalJobsTable } from "@/components/tables-2/payment-portal-jobs/data-table";
import { generatePayrollReport, printSelectedJobs } from "@/lib/job-print";
import { cn } from "@/lib/utils";
import type { TableSettings } from "@/utils/table-settings";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import Link from "next/link";
import { useState } from "react";
import { formatPaymentAmount as money } from "./payment-format";
import {
	getInsuranceTone,
	paymentMethods,
	statusOptions,
	usePaymentPortal,
} from "./use-payment-portal";

const steps = ["Contractor", "Select jobs", "Payment details"];

export function PaymentPortal({
	paymentPortalJobsInitialSettings,
}: { paymentPortalJobsInitialSettings?: Partial<TableSettings> }) {
	const flow = usePaymentPortal();
	const { step, portal, jobs, selectedJobIds, rowSelection, setRowSelection } =
		flow;
	const contractor =
		portal?.contractor ||
		flow.contractors.find((item) => item.id === flow.selectedContractorId);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const busy = flow.createPaymentMutation.isPending;
	const matchingContractors = flow.contractors.filter((contractor) =>
		`${contractor.name} ${contractor.email || ""}`
			.toLowerCase()
			.includes(flow.contractorSearch.trim().toLowerCase()),
	);
	const jobsTable = (reviewOnly = false) => (
		<PaymentPortalJobsTable
			data={reviewOnly ? flow.selectedJobs : jobs}
			emptyText="No unpaid jobs match these filters."
			initialSettings={paymentPortalJobsInitialSettings}
			isLoading={flow.portalQuery.isPending}
			isPendingReviewMode={flow.isPendingReviewMode}
			isReviewPending={flow.reviewMutation.isPending}
			rowSelection={rowSelection}
			setRowSelection={setRowSelection}
			readOnly={reviewOnly}
			onOpen={(job) => flow.setParams({ openJobId: job.id })}
			onMarkSubmitted={flow.handleMarkSubmitted}
			onApprove={(jobId) => flow.handleRowReview(jobId, "approve")}
			onReject={(jobId) => flow.handleRowReview(jobId, "reject")}
		/>
	);

	return (
		<div className="min-w-0 space-y-6 pb-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Prepare a payout
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose a contractor, select work, and review the payment.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/contractors/jobs/payments">
						Payout history <Icons.ArrowRight className="size-4" />
					</Link>
				</Button>
			</header>
			<nav aria-label="Payout steps" className="grid grid-cols-3 border-b pb-4">
				{steps.map((label, index) => (
					<button
						key={label}
						type="button"
						aria-current={index === step ? "step" : undefined}
						disabled={
							busy || index > step || (index === 2 && !flow.canSubmitPayment)
						}
						onClick={() => flow.setStep(index)}
						className={cn(
							"flex min-h-12 min-w-0 items-center gap-2 text-left text-xs font-medium text-muted-foreground sm:text-sm disabled:cursor-default",
							index === step && "text-foreground",
						)}
					>
						<span
							className={cn(
								"flex size-7 shrink-0 items-center justify-center rounded-full border",
								index === step &&
									"border-primary bg-primary text-primary-foreground",
								index < step &&
									"border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
							)}
						>
							{index < step ? <Icons.Check className="size-3.5" /> : index + 1}
						</span>
						<span>{label}</span>
					</button>
				))}
			</nav>

			{step === 0 ? (
				<section className="space-y-5">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold">Who are you paying?</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Contractors with unpaid work.
							</p>
						</div>
						<Button
							variant="outline"
							onClick={() => generatePayrollReport()}
							disabled={
								flow.dashboardQuery.isPending || !flow.contractors.length
							}
						>
							<Icons.Printer className="size-4" />
							Payroll report
						</Button>
					</div>
					<div className="relative max-w-md">
						<Icons.Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
						<Input
							aria-label="Search contractors"
							placeholder="Search contractor"
							className="pl-9"
							value={flow.contractorSearch}
							onChange={(event) => flow.setContractorSearch(event.target.value)}
						/>
					</div>
					{flow.dashboardQuery.isError ? (
						<QueryError onRetry={() => flow.dashboardQuery.refetch()} />
					) : flow.dashboardQuery.isPending ? (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{[1, 2, 3].map((id) => (
								<Skeleton key={id} className="h-48 rounded-xl" />
							))}
						</div>
					) : !matchingContractors.length ? (
						<div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
							{flow.contractorSearch
								? "No contractors match your search."
								: "There is no unpaid contractor work."}
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{matchingContractors.map((contractor) => (
								<button
									key={contractor.id}
									type="button"
									onClick={() => flow.chooseContractor(contractor.id)}
									className="group min-w-0 rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<div className="flex items-start gap-3">
										<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
											{contractor.name
												?.split(" ")
												.map((part) => part[0])
												.slice(0, 2)
												.join("")}
										</span>
										<div className="min-w-0">
											<p className="truncate font-semibold">
												{contractor.name}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{contractor.email || "No email on file"}
											</p>
										</div>
									</div>
									<Badge
										variant={getInsuranceTone(contractor.insurance.state)}
										className="mt-4 max-w-full whitespace-normal"
									>
										{contractor.insurance.message}
									</Badge>
									<div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
										<span>{contractor.readyToPayCount} ready to pay</span>
										<span>{contractor.pendingReviewCount} need review</span>
									</div>
									<div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
										<div>
											<p className="text-xs text-muted-foreground">
												Unpaid work
											</p>
											<p className="mt-1 font-semibold tabular-nums">
												{money(contractor.pendingBill)}
											</p>
										</div>
										<span className="flex items-center gap-1 text-sm font-medium">
											Select <Icons.ArrowRight className="size-4" />
										</span>
									</div>
								</button>
							))}
						</div>
					)}
				</section>
			) : (
				<>
					<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
						<div className="min-w-0">
							<p className="font-semibold">
								{contractor?.name || "Loading contractor…"}
							</p>
							<p className="text-xs text-muted-foreground">
								{contractor?.email || "Contractor payout"}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{contractor ? (
								<Badge
									variant={getInsuranceTone(contractor.insurance.state)}
									className="whitespace-normal"
								>
									{contractor.insurance.message}
								</Badge>
							) : null}
							<Button
								variant="ghost"
								size="sm"
								disabled={busy}
								onClick={() => flow.setStep(0)}
							>
								Change contractor
							</Button>
						</div>
					</section>
					{flow.paymentContext.jobId && !flow.handoffDismissed ? (
						<div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/20 p-4">
							<div className="min-w-0">
								<p className="text-sm font-medium">
									Job #{flow.paymentContext.jobId}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{flow.portalQuery.isFetching
										? "Checking this job’s current payment status…"
										: !flow.contextJob
											? "This job is no longer in the current unpaid view. Nothing was selected automatically."
											: flow.contextJob.paymentStage === "pending-review"
												? "This submission needs review. Open the job to inspect it before approving or paying."
												: selectedJobIds.includes(flow.contextJob.id)
													? "This unpaid job is selected for your payout."
													: "This job is available to inspect in the payment portal."}
								</p>
							</div>
							<div className="flex gap-2">
								{flow.contextJob ? (
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											flow.setParams({ openJobId: flow.contextJob?.id })
										}
									>
										View job
									</Button>
								) : null}
								<Button variant="ghost" size="sm" onClick={flow.dismissHandoff}>
									Dismiss
								</Button>
							</div>
						</div>
					) : null}
					{flow.portalQuery.isError ? (
						<QueryError onRetry={() => flow.portalQuery.refetch()} />
					) : step === 1 ? (
						<section className="min-w-0 space-y-4">
							<div>
								<h2 className="text-lg font-semibold">
									Select jobs to include
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Open a job to inspect the work. Unapproved jobs will be
									approved when paid.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<div className="relative min-w-0 flex-1 basis-60">
									<Icons.Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
									<Input
										aria-label="Search jobs"
										placeholder="Search work, project, lot or model"
										className="pl-9"
										value={flow.jobSearch}
										onChange={(event) => flow.setJobSearch(event.target.value)}
									/>
								</div>
								<Select
									value={flow.status}
									onValueChange={(value) =>
										flow.setStatus(value as typeof flow.status)
									}
								>
									<SelectTrigger
										aria-label="Job status"
										className="w-full sm:w-48"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{statusOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex gap-1">
									<Button
										variant="outline"
										size="sm"
										disabled={
											!flow.markableJobs.length || flow.portalQuery.isFetching
										}
										onClick={() =>
											setRowSelection(
												Object.fromEntries(
													flow.markableJobs.map((job) => [
														String(job.id),
														true,
													]),
												),
											)
										}
									>
										Select all
									</Button>
									<Button
										variant="ghost"
										size="sm"
										disabled={!selectedJobIds.length}
										onClick={() => setRowSelection({})}
									>
										Clear
									</Button>
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={!selectedJobIds.length}
									onClick={() =>
										printSelectedJobs({
											jobIds: selectedJobIds,
											context: "payment-portal",
										})
									}
								>
									<Icons.Printer className="size-4" />
									Print selected
								</Button>
							</div>
							{flow.isPendingReviewMode &&
							flow.selectedPendingReviewJobs.length ? (
								<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
									<p className="text-sm">
										{flow.selectedPendingReviewJobs.length} submissions selected
									</p>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={flow.reviewMutation.isPending}
											onClick={() => flow.runBulkReview("reject")}
										>
											Reject selected
										</Button>
										<Button
											size="sm"
											disabled={flow.reviewMutation.isPending}
											onClick={() => flow.runBulkReview("approve")}
										>
											Approve selected
										</Button>
									</div>
								</div>
							) : null}
							{jobsTable()}
							<footer
								className="sticky bottom-0 z-30 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 pr-20 shadow-sm backdrop-blur sm:pr-4 supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]"
								aria-live="polite"
							>
								<div>
									<p className="text-xs text-muted-foreground">
										{selectedJobIds.length} jobs selected
									</p>
									<p className="text-xl font-semibold tabular-nums">
										{money(flow.totalPayout)}
									</p>
								</div>
								<Button
									disabled={!flow.canSubmitPayment}
									onClick={() => flow.setStep(2)}
								>
									Continue <Icons.ArrowRight className="size-4" />
								</Button>
							</footer>
						</section>
					) : (
						<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
							<section className="min-w-0 space-y-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<h2 className="text-lg font-semibold">
											Review your payout
										</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											{selectedJobIds.length} included jobs
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={busy}
										onClick={() => flow.setStep(1)}
									>
										Edit jobs
									</Button>
								</div>
								{jobsTable(true)}
							</section>
							<section className="space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-4">
								<h2 className="font-semibold">Payment details</h2>
								<fieldset disabled={busy} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="payout-method">Payment method</Label>
										<Select
											value={flow.paymentMethod}
											onValueChange={(value) =>
												flow.setPaymentMethod(
													value as typeof flow.paymentMethod,
												)
											}
											disabled={busy}
										>
											<SelectTrigger id="payout-method">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{paymentMethods.map((method) => (
													<SelectItem key={method} value={method}>
														{method}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{flow.paymentMethod === "Check" ? (
										<div className="space-y-2">
											<Label htmlFor="payout-check">
												Check number{" "}
												<span className="font-normal text-muted-foreground">
													(optional)
												</span>
											</Label>
											<Input
												id="payout-check"
												value={flow.checkNo}
												onChange={(event) =>
													flow.setCheckNo(event.target.value)
												}
												placeholder="e.g. 1042"
											/>
										</div>
									) : null}
								</fieldset>
								<div className="space-y-3 border-y py-4 text-sm">
									<SummaryLine
										label="Job subtotal"
										value={money(flow.selectedTotal)}
									/>
									<SummaryLine
										label={`Profile discount (${flow.chargePercentage}%)`}
										value={`− ${money(flow.discountValue)}`}
									/>
									<div className="flex items-center justify-between gap-3 pt-2">
										<span className="font-medium">Total payout</span>
										<span className="text-2xl font-semibold tabular-nums">
											{money(flow.totalPayout)}
										</span>
									</div>
								</div>
								{flow.selectionWarnings.length ? (
									<div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
										<p className="font-semibold">
											Automatic approval on payout
										</p>
										{flow.selectionWarnings.map((warning) => (
											<div key={warning.status}>
												<p>
													{warning.count} {warning.status.toLowerCase()} job
													{warning.count === 1 ? "" : "s"} will be approved when
													this payout is recorded.
												</p>
												<Button
													variant="ghost"
													size="sm"
													className="mt-1 h-auto px-0 text-inherit underline"
													disabled={busy}
													onClick={() =>
														setRowSelection((current) => {
															const next = { ...current };
															for (const id of warning.jobIds)
																delete next[String(id)];
															return next;
														})
													}
												>
													Remove these jobs
												</Button>
											</div>
										))}
									</div>
								) : null}
								<p className="text-xs leading-5 text-muted-foreground">
									Record the payment after paying your contractor using the
									selected method.
								</p>
								<Button
									className="w-full"
									size="lg"
									disabled={!flow.canSubmitPayment || busy}
									onClick={() => setConfirmOpen(true)}
								>
									{busy ? "Recording payout…" : "Review and record payout"}
									<Icons.ArrowRight className="size-4" />
								</Button>
							</section>
						</div>
					)}
				</>
			)}
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Record {money(flow.totalPayout)} for {portal?.contractor.name}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedJobIds.length} jobs · {flow.paymentMethod}
							{flow.paymentMethod === "Check" && flow.checkNo
								? ` · Check ${flow.checkNo}`
								: ""}
							.{" "}
							{flow.selectionWarnings.length
								? "The unapproved jobs shown in your review will also be approved. "
								: ""}
							This records the payout in GND.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Back to review</AlertDialogCancel>
						<AlertDialogAction
							disabled={!flow.canSubmitPayment || busy}
							onClick={flow.submitPayment}
						>
							Record payout
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function SummaryLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium tabular-nums">{value}</span>
		</div>
	);
}
function QueryError({ onRetry }: { onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
		>
			<p className="text-sm">Payment information could not be loaded.</p>
			<Button variant="outline" onClick={onRetry}>
				Try again
			</Button>
		</div>
	);
}
