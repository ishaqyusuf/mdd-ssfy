import { Avatar } from "@/components/avatar";
import { SearchInput } from "@/components/search-input";
import {
	JobOverviewProvider,
	useCreateJobOverviewContext,
	useJobOverviewContext,
} from "@/contexts/job-overview-context";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useAuth } from "@/hooks/use-auth";
import { getJobPaymentHandoff } from "@/lib/job-payment-portal";
import Link from "next/link";
import { useJobRole } from "@/hooks/use-job-role";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Collapsible, CollapsibleContent } from "@gnd/ui/collapsible";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Progress } from "@gnd/ui/custom/progress";
import { Icons } from "@gnd/ui/icons";
import { Card } from "@gnd/ui/namespace";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { getInitials } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import React from "react";
import { CustomModal } from "../custom-modal";
import { ApprovalForm } from "./approval-form";
import { ApprovedForm } from "./approved-form";
import { FinancialSummary } from "./financial-summary";
import { JobActivities } from "./job-activities";
import { JobScope } from "./job-scope";
import { PaymentOverviewModal } from "./payment-overview-modal";
import { RejectedForm } from "./rejected-form";

function getInsuranceMeta(status: InsuranceRequirement) {
	switch (status.state) {
		case "valid":
			return {
				label: "Insurance approved",
				className: "text-emerald-600",
			};
		case "expiring_soon":
			return {
				label: "Insurance expiring soon",
				className: "text-amber-600",
			};
		case "pending":
			return {
				label: "Insurance pending review",
				className: "text-amber-600",
			};
		case "expired":
			return {
				label: "Insurance expired",
				className: "text-red-600",
			};
		case "rejected":
			return {
				label: "Insurance rejected",
				className: "text-red-600",
			};
		default:
			return {
				label: "Insurance missing",
				className: "text-red-600",
			};
	}
}

function getSubmittedFromLabel(source: unknown) {
	if (source === "web") return "Website";
	if (source === "mobile") return "Mobile app";
	return "Unknown source";
}

export function JobOverviewModal() {
	const { setParams, openJobId, opened } = useJobParams();

	return (
		<CustomModal
			className="h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none p-0 sm:max-w-none md:h-[90dvh] md:w-[calc(100vw-4rem)] md:max-w-6xl md:rounded-lg [&>div:first-child]:px-5 [&>div:first-child]:pt-5"
			open={opened}
			onOpenChange={(open) => {
				if (!open) {
					setParams({ openJobId: null });
				}
			}}
			title={openJobId ? `Job ${openJobId} overview` : "Job overview"}
			description="Job details and actions."
			titleAsChild
			descriptionAsChild
			// title={`Job #${openJobId} Overview`}
			// description={`Details and information about Job #${openJobId}.`}
			size={"5xl"}
		>
			<CustomModal.Content className="relative mx-0 min-h-0 max-h-none flex-1 p-0 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0">
				<Suspense fallback={<LoadingSkeleton />}>
					<Content />
				</Suspense>
			</CustomModal.Content>
		</CustomModal>
	);
}
function Content() {
	const ctx = useCreateJobOverviewContext();
	const job = ctx.overview;
	const pathname = usePathname();
	const { isAdmin } = useJobRole();
	const auth = useAuth();
	const [reviewOpen, setReviewOpen] = React.useState(false);
	const [isPaymentOverviewOpen, setIsPaymentOverviewOpen] =
		React.useState(false);
	if (!job) return null;
	const paymentHandoff = getJobPaymentHandoff(job);
	const canViewPayments = !!(
		auth.can?.viewJobPayment || auth.can?.editJobPayment
	);
	const submittedFromLabel = getSubmittedFromLabel(job.meta?.submittedFrom);
	const normalizedStatus = String(job?.status || "")
		.toLowerCase()
		.replace(/[_\s]+/g, "-");
	const isPaymentCancelled =
		normalizedStatus === "payment-cancelled" ||
		normalizedStatus === "payment-canceled";
	const canConfigure =
		!!job?.hasConfigRequested &&
		Number(job?.home?.communityTemplateId || 0) > 0 &&
		Number(job?.builderTaskId || 0) > 0;
	return (
		<JobOverviewProvider value={ctx}>
			<CustomModal.Title>
				<div className="flex min-w-0 flex-wrap items-center gap-2 pr-8">
					<span>{[job?.title, job?.subtitle].filter(Boolean).join(" · ")}</span>
					<Progress.Status noDot badge>
						{String(job?.jobType || "v2").toUpperCase()}
					</Progress.Status>
					{isPaymentCancelled ? (
						<>
							<Progress.Status noDot badge>
								Approved
							</Progress.Status>
							<Progress.Status noDot badge>
								Payment Cancelled
							</Progress.Status>
						</>
					) : (
						<Progress.Status noDot badge>
							{job?.status}
						</Progress.Status>
					)}
				</div>
			</CustomModal.Title>
			<CustomModal.Description>
				<p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span className="font-mono">{job.jobId}</span>
					<span>•</span>
					<span>Created {formatDate(job.createdAt)}</span>
					{isAdmin ? (
						<>
							<span>•</span>
							<span>Submitted from {submittedFromLabel}</span>
						</>
					) : null}
				</p>
			</CustomModal.Description>
			<div className="min-w-0 flex-1 p-5">
				<div className="mx-auto grid min-w-0 max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
					{/* LEFT COLUMN: Details & Tasks */}
					<div className="min-w-0 space-y-5">
						<JobOverviewActionsCard
							canConfigure={canConfigure}
							pathname={pathname}
							onReview={() => setReviewOpen((open) => !open)}
						/>
						{job.status === "Submitted" && !reviewOpen ? (
							<Alert>
								<Icons.ShieldCheck />
								<AlertDescription>
									Submitted for review. Confirm the scope and quantities before
									approving.
								</AlertDescription>
							</Alert>
						) : null}
						{isAdmin ? (
							<Collapsible open={reviewOpen} onOpenChange={setReviewOpen}>
								<CollapsibleContent
									id="job-review-section"
									className="space-y-4"
								>
									{job.status === "Submitted" && <ApprovalForm />}
									{job.status === "Approved" && <ApprovedForm />}
									{job.status === "Rejected" && <RejectedForm />}
								</CollapsibleContent>
							</Collapsible>
						) : null}
						<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
							<Card>
								<Card.Header>
									<div className="flex items-center gap-2 text-muted-foreground">
										<Icons.Building2 className="h-4 w-4" />
										<span className="text-xs font-medium uppercase tracking-wider">
											Project & Builder
										</span>
									</div>
								</Card.Header>
								<Card.Content className="flex flex-col gap-3">
									<div>
										<p className="font-medium text-foreground">
											{job?.project?.title || job?.title || "Custom Project"}
										</p>
										<p className="text-sm text-muted-foreground">
											{job?.project?.builder?.name ||
												(job?.isCustom ? "Custom project" : "Unknown builder")}
										</p>
									</div>
								</Card.Content>
							</Card>

							<Card>
								<Card.Header>
									<div className="flex items-center gap-2 text-muted-foreground">
										<Icons.MapPin className="h-4 w-4" />
										<span className="text-xs font-medium uppercase tracking-wider">
											Location
										</span>
									</div>
								</Card.Header>
								<Card.Content className="flex flex-col gap-3">
									<div>
										<p className="font-medium text-foreground">
											{job?.home?.modelName || "No linked unit"}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											{job.home?.lotBlock}
										</p>
									</div>
								</Card.Content>
							</Card>

							<Card>
								<Card.Header>
									<div className="flex items-center gap-2 text-muted-foreground">
										<Icons.Wrench className="h-4 w-4" />
										<span className="text-xs font-medium uppercase tracking-wider">
											Builder Task
										</span>
									</div>
								</Card.Header>
								<Card.Content className="flex flex-col gap-3">
									<div>
										<p className="font-medium text-foreground">
											{job?.builderTask?.taskName ||
												(job?.isCustom ? "Custom Task" : "Not linked")}
										</p>
										<p className="text-sm text-muted-foreground">
											Job type {String(job?.jobType || "v2").toUpperCase()}
										</p>
									</div>
								</Card.Content>
							</Card>
						</div>
						<JobScope />
					</div>
					{/* RIGHT COLUMN: Financials & History */}
					<div className="space-y-6">
						<FinancialSummary />
						<Card>
							<Card.Header className="gap-1 p-4">
								<Card.Title className="text-base">Payment</Card.Title>
								<Card.Description>
									{job.payment?.id
										? `Linked to batch #${job.payment.id}`
										: paymentHandoff?.isReview
											? "Review the submission before preparing a payout."
											: paymentHandoff
												? "Prepare a payout with this contractor and job already in context."
												: "Payment becomes available after this job is submitted or approved."}
								</Card.Description>
							</Card.Header>
							<Card.Content className="flex flex-col gap-3 p-4 pt-0">
								{job.payment?.id ? (
									<>
										<p className="text-sm text-muted-foreground">
											Batch amount{" "}
											<span className="font-medium text-foreground">
												${Number(job.payment.amount || 0).toFixed(2)}
											</span>
										</p>
										<Button
											variant="outline"
											onClick={() => setIsPaymentOverviewOpen(true)}
											className="w-full"
										>
											View payment
										</Button>
									</>
								) : canViewPayments && paymentHandoff ? (
									<Button asChild className="w-full">
										<Link href={paymentHandoff.href} prefetch={false}>
											<Icons.CreditCard data-icon="inline-start" />
											{paymentHandoff.label}
											<Icons.ArrowUpRight data-icon="inline-end" />
										</Link>
									</Button>
								) : null}
								<p className="text-xs text-muted-foreground">
									Payments are processed in the payment portal and recorded in a
									batch.
								</p>
							</Card.Content>
						</Card>
						{/* Assigned To */}
						<div className="bg-card border border-border rounded-lg p-5 ">
							<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
								Assigned Contractor
							</h4>
							<div className="flex items-center gap-3">
								<Avatar name={job?.user?.name} />
								<div>
									<p className="font-medium text-foreground text-sm">
										{job?.user?.name}
									</p>
									<p className="text-xs text-muted-foreground">Contractor</p>
								</div>
								<button
									type="button"
									className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted"
								>
									<Icons.MessageSquare size={18} />
								</button>
							</div>
						</div>
						<JobActivities />
					</div>
				</div>
			</div>
			<PaymentOverviewModal
				open={isPaymentOverviewOpen}
				onOpenChange={setIsPaymentOverviewOpen}
				paymentId={job.payment?.id ?? null}
			/>
		</JobOverviewProvider>
	);
}

function JobOverviewActionsCard({
	canConfigure,
	pathname,
	onReview,
}: {
	canConfigure: boolean;
	pathname: string;
	onReview: () => void;
}) {
	const { overview: job } = useJobOverviewContext();
	const { isAdmin } = useJobRole();
	const { setParams: setOverviewParams } = useJobParams();
	const { setParams: setJobFormParams } = useJobFormParams();
	const { setParams: setCommunityInstallCostParams } =
		useCommunityInstallCostParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [showReassignPicker, setShowReassignPicker] = React.useState(false);
	const { data: employeesData, isPending: isEmployeesPending } = useQuery(
		trpc.hrm.getEmployees.queryOptions(
			{
				roles: ["1099 Contractor", "Punchout"],
				size: 500,
			},
			{ enabled: !!isAdmin && showReassignPicker },
		),
	);
	const employees = employeesData?.data || [];
	const [employeeQuery, setEmployeeQuery] = React.useState("");
	const employeeResults = React.useMemo(() => {
		const normalizedQuery = employeeQuery.trim().toLowerCase();
		if (!normalizedQuery) return employees;
		return employees.filter((employee) => {
			const haystack = [
				employee.name,
				employee.email,
				employee.role,
				employee.username,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(normalizedQuery);
		});
	}, [employees, employeeQuery]);

	const normalizedStatus = String(job?.status || "")
		.toLowerCase()
		.replace(/[_\s]+/g, " ");
	const isAssigned = normalizedStatus === "assigned";
	const isStarted = normalizedStatus === "started";
	const isApproved = normalizedStatus === "approved";
	const isRejected = normalizedStatus === "rejected";
	const isSubmitted = normalizedStatus === "submitted";
	const isConfigRequested = normalizedStatus === "config requested";
	const isSubmittable = [
		"assigned",
		"started",
		"in progress",
		"config requested",
		"submitted",
	].includes(normalizedStatus);
	const showReviewAction = isAdmin && (isSubmitted || isApproved || isRejected);
	const canDelete = job?.deletionEligibility?.canDelete ?? false;

	const { mutate: deleteJob, isPending: isDeleting } = useMutation(
		trpc.jobs.deleteJob.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.overview.queryKey({
							jobId: job.id,
						}),
					}),
				]);
				setOverviewParams({ openJobId: null });
				toast({
					title: "Job deleted",
					variant: "success",
				});
			},
			onError: () => {
				toast({
					title: "Unable to delete job",
					variant: "destructive",
				});
			},
		}),
	);
	const { mutate: reAssignJob, isPending: isReAssigning } = useMutation(
		trpc.jobs.reAssignJob.mutationOptions({
			onSuccess: async (_, variables) => {
				if (!variables) return;
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.overview.queryKey({
							jobId: variables.jobId,
						}),
					}),
				]);
				setOverviewParams({ openJobId: null });
				toast({
					title: "Job reassigned",
					variant: "success",
				});
			},
			onError: () => {
				toast({
					title: "Unable to re-assign job right now.",
					variant: "destructive",
				});
			},
		}),
	);

	const openJobForm = (step: number) => {
		setOverviewParams({ openJobId: null });
		setJobFormParams({
			step,
			jobId: Number(job?.id),
			projectId: Number(job?.project?.id || 0) || null,
			unitId: Number(job?.home?.id || 0) || null,
			modelId: Number(job?.home?.communityTemplateId || 0) || null,
			builderTaskId:
				Number(job?.builderTaskId || 0) || (job?.isCustom ? -1 : null),
			userId: Number(job?.user?.id || 0) || null,
		});
	};

	const handleConfigure = () => {
		const useSidebarView = pathname.includes("/community/community-template/");
		setCommunityInstallCostParams({
			mode: "v2",
			view: useSidebarView ? "template-edit" : "template-list",
			editCommunityModelInstallCostId: Number(job?.home?.communityTemplateId),
			selectedBuilderTaskId: Number(job?.builderTaskId),
			requestBuilderTaskId: Number(job?.builderTaskId),
			jobId: Number(job?.id),
			contractorId: Number(job?.user?.id),
		});
	};

	const hasAnyAction = Boolean(
		(isAdmin && canConfigure) ||
			(isAdmin && isAssigned) ||
			showReviewAction ||
			isSubmittable,
	);

	if (!hasAnyAction) return null;

	return (
		<Card>
			<Card.Content className="flex flex-wrap items-center gap-2 p-3">
				{isAdmin && canConfigure && (
					<Button className="w-full sm:w-auto" onClick={handleConfigure}>
						<Icons.Wrench className="mr-2 h-4 w-4" />
						Configure
					</Button>
				)}

				{isAdmin && isAssigned && !showReassignPicker && (
					<Button
						className="w-full sm:w-auto"
						variant="secondary"
						onClick={() => setShowReassignPicker(true)}
					>
						<Icons.UserPlus className="mr-2 h-4 w-4" />
						Re-Assign Job
					</Button>
				)}

				{isAdmin && isAssigned && showReassignPicker && (
					<div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-semibold text-foreground">
								Select contractor
							</p>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setShowReassignPicker(false)}
							>
								Cancel
							</Button>
						</div>
						<SearchInput
							value={employeeQuery}
							onChangeText={setEmployeeQuery}
							placeholder="Search contractor..."
						/>
						<div className="max-h-72 space-y-2 overflow-y-auto">
							{isEmployeesPending ? (
								<div className="space-y-2">
									<Skeleton className="h-12 w-full rounded-lg" />
									<Skeleton className="h-12 w-full rounded-lg" />
								</div>
							) : (
								employeeResults.map((employee) => {
									const insuranceStatus = getInsuranceRequirement(
										employee.documents || [],
									);
									const insuranceMeta = getInsuranceMeta(insuranceStatus);

									return (
										<button
											key={employee.id}
											type="button"
											disabled={
												isReAssigning || employee.id === Number(job?.user?.id)
											}
											onClick={() => {
												if (!job?.id || !job?.user?.id) return;
												reAssignJob({
													jobId: job.id,
													oldUserId: Number(job.user.id),
													newUserId: employee.id,
												});
											}}
											className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											<div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-medium text-primary">
												{getInitials(employee.name) || employee.name.charAt(0)}
											</div>
											<div className="w-full sm:w-auto">
												<p className="text-sm font-semibold text-foreground">
													{employee.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{employee.role}
												</p>
												<p
													className={`mt-1 text-xs font-medium ${insuranceMeta.className}`}
												>
													{insuranceMeta.label}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{insuranceStatus.message}
												</p>
											</div>
											{employee.id === Number(job?.user?.id) ? (
												<span className="text-xs font-medium text-muted-foreground">
													Current
												</span>
											) : null}
										</button>
									);
								})
							)}
							{!isEmployeesPending && employeeResults.length === 0 ? (
								<div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
									No contractors found.
								</div>
							) : null}
						</div>
					</div>
				)}

				{isSubmittable && (
					<div className="min-w-0">
						{!isAdmin ? (
							<div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
								<p className="text-sm font-semibold text-foreground">
									Contractor Submission Required
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Open the submit flow to confirm completed work, update task
									qty, and send this job forward for review.
								</p>
							</div>
						) : null}
						<div className="flex gap-3">
							<Button
								className="w-full sm:w-auto"
								onClick={() => openJobForm(isAdmin ? 5 : 4)}
								disabled={isConfigRequested}
								title={
									isConfigRequested
										? "Configuration has already been requested for this job."
										: undefined
								}
							>
								<Icons.CheckCircle2 className="mr-2 h-4 w-4" />
								{isSubmitted ? "Update Submission" : "Submit Job"}
							</Button>
							{!isAdmin ? (
								<Button
									type="button"
									variant="destructive"
									size="icon"
									disabled={isDeleting || !canDelete}
									onClick={() => {
										if (!job?.id) return;
										deleteJob({ id: job.id });
									}}
									title={job?.deletionEligibility?.reason || "Delete job"}
								>
									<Icons.Trash2 className="h-4 w-4" />
								</Button>
							) : null}
						</div>
					</div>
				)}

				{isAdmin && (isAssigned || isStarted) && (
					<Button
						type="button"
						variant="destructive"
						className="w-full sm:w-auto"
						disabled={isDeleting || !canDelete}
						onClick={() => {
							if (!job?.id) return;
							deleteJob({ id: job.id });
						}}
					>
						<Icons.Trash2 className="mr-2 h-4 w-4" />
						Delete
					</Button>
				)}

				{showReviewAction && (
					<Button
						className="w-full sm:w-auto"
						variant="outline"
						onClick={onReview}
					>
						<Icons.ShieldCheck className="mr-2 h-4 w-4" />
						Open Review
					</Button>
				)}
			</Card.Content>
		</Card>
	);
}
function LoadingSkeleton() {
	return (
		<>
			<div className="flex flex-col h-full bg-background overflow-hidden">
				<header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
					<div className="flex items-center gap-4">
						<Skeleton className="w-10 h-10 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-20" />
						<Skeleton className="h-10 w-24" />
					</div>
				</header>
				<div className="min-w-0 flex-1 p-5">
					<div className="mx-auto grid min-w-0 max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
						<div className="min-w-0 space-y-5">
							<Skeleton className="h-32 rounded-lg" />
							<div className="grid grid-cols-2 gap-4">
								<Skeleton className="h-24 rounded-lg" />
								<Skeleton className="h-24 rounded-lg" />
							</div>
							<Skeleton className="h-64 rounded-lg" />
						</div>
						<div className="space-y-6">
							<Skeleton className="h-48 rounded-lg" />
							<Skeleton className="h-24 rounded-lg" />
							<Skeleton className="h-64 rounded-lg" />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
