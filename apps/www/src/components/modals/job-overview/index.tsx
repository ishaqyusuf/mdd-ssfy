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
import { useJobRole } from "@/hooks/use-job-role";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/custom/progress";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { Card } from "@gnd/ui/namespace";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { getInitials } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { Building2, CreditCard, MapPin, MessageSquare } from "lucide-react";
import {
	CheckCircle2,
	ShieldCheck,
	Trash2,
	UserPlus,
	Wrench,
} from "lucide-react";
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

export function JobOverviewModal() {
	const { setParams, openJobId, opened } = useJobParams();

	return (
		<CustomModal
			className=""
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
			<CustomModal.Content className="max-h-[75vh] min-h-[75vh]  relative -mx-0">
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
	const [isPaymentOverviewOpen, setIsPaymentOverviewOpen] =
		React.useState(false);
	if (!job) return null;
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
				<div className="flex gap-4 items-center">
					<span>
						{job?.title} - {job?.subtitle}
					</span>
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
				<p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
					<span className="font-mono">{job.jobId}</span>
					<span>•</span>
					<span>Created {formatDate(job.createdAt)}</span>
				</p>
			</CustomModal.Description>
			<div className="flex-1 overflow-y-auto p-6 md:p-8">
				<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* LEFT COLUMN: Details & Tasks */}
					<div className="lg:col-span-2 space-y-6">
						<JobOverviewActionsCard
							canConfigure={canConfigure}
							pathname={pathname}
						/>
						<div id="job-review-section" className="space-y-6">
							{job?.status === "Submitted" && <ApprovalForm />}
							{job?.status === "Approved" && <ApprovedForm />}
							{job?.status === "Rejected" && <RejectedForm />}
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Card>
								<Card.Header>
									<div className="flex items-center gap-2 text-muted-foreground">
										<Building2 className="h-4 w-4" />
										<span className="text-xs font-bold uppercase tracking-wider">
											Project & Builder
										</span>
									</div>
								</Card.Header>
								<Card.Content className="flex flex-col gap-3">
									<div>
										<p className="font-bold text-foreground">
											{job?.project?.title}
										</p>
										<p className="text-sm text-muted-foreground">
											{job?.project?.builder?.name}
										</p>
									</div>
								</Card.Content>
							</Card>

							<Card>
								<Card.Header>
									<div className="flex items-center gap-2 text-muted-foreground">
										<MapPin className="h-4 w-4" />
										<span className="text-xs font-bold uppercase tracking-wider">
											Location
										</span>
									</div>
								</Card.Header>
								<Card.Content className="flex flex-col gap-3">
									<div>
										<p className="font-bold text-foreground">
											{job?.home?.modelName}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											{job.home?.lotBlock}
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
						<div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
							<div className="flex items-center gap-2 text-muted-foreground">
								<CreditCard className="h-4 w-4" />
								<h4 className="text-xs font-bold uppercase tracking-wider">
									Payment Information
								</h4>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">
									Batch Payment ID
								</p>
								<p className="font-bold text-foreground">
									{job.payment?.id
										? `#${job.payment.id}`
										: "Not in a payment batch"}
								</p>
							</div>
							{job.payment?.id && (
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">Batch Amount</p>
									<p className="font-bold text-foreground">
										${Number(job.payment.amount || 0).toFixed(2)}
									</p>
								</div>
							)}
							<p className="text-xs text-muted-foreground">
								Job payments are processed in batches. Click to view all jobs in
								this payment.
							</p>
							<Button
								variant="outline"
								onClick={() => setIsPaymentOverviewOpen(true)}
								disabled={!job.payment?.id}
								className="w-full"
							>
								View Payment
							</Button>
						</div>
						{/* Assigned To */}
						<div className="bg-card border border-border rounded-xl p-5 shadow-sm">
							<h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
								Assigned Contractor
							</h4>
							<div className="flex items-center gap-3">
								<Avatar name={job?.user?.name} />
								<div>
									<p className="font-bold text-foreground text-sm">
										{job?.user?.name}
									</p>
									<p className="text-xs text-muted-foreground">Contractor</p>
								</div>
								<button
									type="button"
									className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted"
								>
									<MessageSquare size={18} />
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
}: {
	canConfigure: boolean;
	pathname: string;
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
		trpc.hrm.getEmployees.queryOptions({
			roles: ["1099 Contractor", "Punchout"],
		}),
	);
	const employees = employeesData?.data || [];
	const {
		query: employeeQuery,
		results: employeeResults,
		setQuery: setEmployeeQuery,
	} = useSearch({
		items: employees,
	});

	const normalizedStatus = String(job?.status || "")
		.toLowerCase()
		.replace(/[_\s]+/g, " ");
	const isAssigned = normalizedStatus === "assigned";
	const isApproved = normalizedStatus === "approved";
	const isRejected = normalizedStatus === "rejected";
	const isSubmitted = normalizedStatus === "submitted";
	const isConfigRequested = normalizedStatus === "config requested";
	const isWorkerSubmittable = [
		"assigned",
		"in progress",
		"config requested",
		"submitted",
	].includes(normalizedStatus);
	const showReviewAction = isAdmin && (isSubmitted || isApproved || isRejected);

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
			builderTaskId: Number(job?.builderTaskId || 0) || null,
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
			(!isAdmin && isWorkerSubmittable),
	);

	if (!hasAnyAction) return null;

	return (
		<Card>
			<Card.Header className="pb-0">
				<Card.Title className="text-base">Job Actions</Card.Title>
				<Card.Description>
					Quick actions available for this job in the current state.
				</Card.Description>
			</Card.Header>
			<Card.Content className="space-y-3">
				{isAdmin && canConfigure && (
					<Button className="w-full" onClick={handleConfigure}>
						<Wrench className="mr-2 h-4 w-4" />
						Configure
					</Button>
				)}

				{isAdmin && isAssigned && !showReassignPicker && (
					<Button
						className="w-full"
						variant="secondary"
						onClick={() => setShowReassignPicker(true)}
					>
						<UserPlus className="mr-2 h-4 w-4" />
						Re-Assign Job
					</Button>
				)}

				{isAdmin && isAssigned && showReassignPicker && (
					<div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
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
											<div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">
												{getInitials(employee.name) || employee.name.charAt(0)}
											</div>
											<div className="flex-1">
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

				{!isAdmin && isWorkerSubmittable && (
					<div className="flex gap-3">
						<Button
							className="flex-1"
							onClick={() => openJobForm(4)}
							disabled={isConfigRequested}
							title={
								isConfigRequested
									? "Configuration has already been requested for this job."
									: undefined
							}
						>
							<CheckCircle2 className="mr-2 h-4 w-4" />
							{isSubmitted ? "Update Submission" : "Submit"}
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							disabled={isDeleting}
							onClick={() => {
								if (!job?.id) return;
								deleteJob({ id: job.id });
							}}
							title="Delete job"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)}

				{isAdmin && isAssigned && (
					<Button
						type="button"
						variant="destructive"
						className="w-full"
						disabled={isDeleting}
						onClick={() => {
							if (!job?.id) return;
							deleteJob({ id: job.id });
						}}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</Button>
				)}

				{showReviewAction && (
					<Button
						className="w-full"
						variant="outline"
						onClick={() => {
							document.getElementById("job-review-section")?.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
						}}
					>
						<ShieldCheck className="mr-2 h-4 w-4" />
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
				<div className="flex-1 overflow-y-auto p-6 md:p-8">
					<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2 space-y-6">
							<Skeleton className="h-32 rounded-xl" />
							<div className="grid grid-cols-2 gap-4">
								<Skeleton className="h-24 rounded-xl" />
								<Skeleton className="h-24 rounded-xl" />
							</div>
							<Skeleton className="h-64 rounded-xl" />
						</div>
						<div className="space-y-6">
							<Skeleton className="h-48 rounded-xl" />
							<Skeleton className="h-24 rounded-xl" />
							<Skeleton className="h-64 rounded-xl" />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
