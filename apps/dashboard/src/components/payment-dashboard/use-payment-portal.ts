"use client";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import {
	getHandoffSelection,
	readJobPaymentContext,
} from "@/lib/job-payment-portal";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import type { RowSelectionState } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPaymentSelection } from "./payment-selection";
export const paymentMethods = ["Check", "ACH", "Zelle", "Cash"] as const;
export const statusOptions = [
	{ label: "All unpaid jobs", value: "all" },
	{ label: "Pending review", value: "pending-review" },
	{ label: "Ready to pay", value: "ready-to-pay" },
	{ label: "Approved", value: "approved" },
	{ label: "Completed", value: "completed" },
	{ label: "Payment cancelled", value: "payment-cancelled" },
] as const;

function getPortalStatus(value: string) {
	return statusOptions.find((option) => option.value === value)?.value || "all";
}

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

export function getInsuranceTone(state?: string | null) {
	switch (state) {
		case "valid":
			return "default" as const;
		case "expiring_soon":
			return "secondary" as const;
		default:
			return "destructive" as const;
	}
}

export function usePaymentPortal() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { opened: jobOverviewOpen, setParams } = useJobParams();
	const searchParams = useSearchParams();
	const router = useRouter();
	const [params, setWorkflowParams] = useQueryStates({
		contractorId: parseAsInteger,
		payoutStep: parseAsInteger,
		jobId: parseAsInteger,
		status: parseAsString,
	});
	const selectedContractorId = params.contractorId;
	const step = selectedContractorId
		? Math.min(2, Math.max(0, params.payoutStep ?? 1))
		: 0;
	const paymentContext = useMemo(
		() => readJobPaymentContext(searchParams),
		[searchParams],
	);
	const handoffKey = paymentContext.jobId
		? `${paymentContext.contractorId}:${paymentContext.jobId}:${paymentContext.status}`
		: "";
	const currentHandoff = useRef(handoffKey);
	const consumedHandoff = useRef("");
	const [handoffDismissed, setHandoffDismissed] = useState(false);
	const dismissHandoff = () => {
		consumedHandoff.current = handoffKey;
		setHandoffDismissed(true);
	};
	const [contractorSearch, setContractorSearch] = useState("");
	const [jobSearch, setJobSearch] = useState("");
	const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>(
		getPortalStatus(paymentContext.status),
	);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [paymentMethod, setPaymentMethod] =
		useState<(typeof paymentMethods)[number]>("Check");
	const [checkNo, setCheckNo] = useState("");

	const dashboardQuery = useQuery(trpc.jobs.paymentDashboard.queryOptions({}));

	const contractors = dashboardQuery.data?.contractors || [];

	const previousContractor = useRef(selectedContractorId);
	useEffect(() => {
		if (
			previousContractor.current !== selectedContractorId ||
			currentHandoff.current !== handoffKey
		) {
			previousContractor.current = selectedContractorId;
			currentHandoff.current = handoffKey;
			consumedHandoff.current = "";
			setHandoffDismissed(false);
			setRowSelection({});
			setJobSearch("");
			setStatus(getPortalStatus(paymentContext.status));
			setCheckNo("");
			setPaymentMethod("Check");
		}
	}, [selectedContractorId, handoffKey, paymentContext.status]);

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
	useEffect(() => {
		if (
			!handoffKey ||
			consumedHandoff.current === handoffKey ||
			portalQuery.isFetching ||
			!portal ||
			portal.contractor.id !== paymentContext.contractorId ||
			selectedContractorId !== paymentContext.contractorId
		)
			return;
		consumedHandoff.current = handoffKey;
		const jobId = getHandoffSelection(
			paymentContext,
			selectedContractorId,
			portal.jobs.filter(
				(job): job is typeof job & { id: number } =>
					Number.isSafeInteger(job.id) && Number(job.id) > 0,
			),
		);
		if (jobId) setRowSelection({ [String(jobId)]: true });
	}, [
		handoffKey,
		portal,
		portalQuery.isFetching,
		selectedContractorId,
		paymentContext,
	]);
	const contextJob =
		!portalQuery.isFetching &&
		portal?.contractor.id === paymentContext.contractorId
			? portal.jobs.find((job) => job.id === paymentContext.jobId)
			: undefined;
	const isPendingReviewMode = status === "pending-review";
	const selection = getPaymentSelection(
		jobs,
		rowSelection,
		Number(portal?.contractor.chargePercentage || 0),
	);
	const {
		selectedJobIds,
		selectedJobs,
		selectedTotal,
		discountValue,
		totalPayout,
		chargePercentage,
	} = selection;

	const createPaymentMutation = useMutation(
		trpc.jobs.createPaymentPortal.mutationOptions({
			onSuccess: async (data) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentDashboard.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentPortal.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.infiniteQueryKey(),
					}),
				]);

				await queryClient.invalidateQueries({
					queryKey: trpc.jobs.contractorPayouts.infiniteQueryKey(),
				});
				setRowSelection({});
				setCheckNo("");
				router.push(`/contractors/jobs/payments/${data.id}`);

				toast({
					title: "Payout recorded",
					description: `Payment batch #${data.id} was created for ${formatCurrency(
						data.totalPayout,
					)}.`,
				});
			},
			onError: (error) =>
				toast({
					title: "Payout could not be recorded",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	const reviewMutation = useMutation(
		trpc.jobs.jobReview.mutationOptions({
			onSuccess: async (_, variables) => {
				if (!variables) return;

				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentDashboard.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentPortal.queryKey(),
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
		!!selectedContractorId &&
		!portalQuery.isFetching &&
		!reviewMutation.isPending &&
		selectedJobIds.length > 0 &&
		totalPayout >= 0;
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

	const chooseContractor = (id: number) => {
		if (id === selectedContractorId) {
			setWorkflowParams({ payoutStep: 1 });
			return;
		}
		setRowSelection({});
		setJobSearch("");
		setStatus("all");
		setCheckNo("");
		setPaymentMethod("Check");
		dismissHandoff();
		setWorkflowParams({
			contractorId: id,
			payoutStep: 1,
			jobId: null,
			status: null,
		});
	};
	const changeSearch = (value: string) => {
		dismissHandoff();
		setRowSelection({});
		setJobSearch(value);
	};
	const changeStatus = (value: (typeof statusOptions)[number]["value"]) => {
		dismissHandoff();
		setRowSelection({});
		setStatus(value);
	};
	const submitPayment = () => {
		if (
			!selectedContractorId ||
			!canSubmitPayment ||
			createPaymentMutation.isPending
		)
			return;
		createPaymentMutation.mutate({
			userId: selectedContractorId,
			jobIds: selectedJobIds,
			adjustment: 0,
			discount: discountValue,
			paymentMethod,
			checkNo:
				paymentMethod === "Check" ? checkNo.trim() || undefined : undefined,
		});
	};
	return {
		dashboardQuery,
		portalQuery,
		portal,
		contractors,
		jobs,
		step,
		setStep: (payoutStep: number) => setWorkflowParams({ payoutStep }),
		chooseContractor,
		contractorSearch,
		setContractorSearch,
		selectedContractorId,
		jobSearch,
		setJobSearch: changeSearch,
		status,
		setStatus: changeStatus,
		rowSelection,
		setRowSelection,
		...selection,
		paymentMethod,
		setPaymentMethod,
		checkNo,
		setCheckNo,
		canSubmitPayment,
		selectedPendingReviewJobs,
		selectionWarnings,
		isPendingReviewMode,
		markableJobs,
		runBulkReview,
		handleRowReview,
		handleMarkSubmitted,
		reviewMutation,
		createPaymentMutation,
		submitPayment,
		jobOverviewOpen,
		setParams,
		paymentContext,
		contextJob,
		handoffDismissed,
		dismissHandoff,
	};
}
