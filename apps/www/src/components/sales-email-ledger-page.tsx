"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { SalesEmailLedgerColumnVisibility } from "@/components/tables-2/sales-email-ledger/column-visibility";
import type { SalesEmailLedgerRow } from "@/components/tables-2/sales-email-ledger/columns";
import {
	DataTable,
	type PageInfo as SalesEmailLedgerPageInfo,
} from "@/components/tables-2/sales-email-ledger/data-table";
import { SalesEmailLedgerSkeleton } from "@/components/tables-2/sales-email-ledger/skeleton";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
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
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, useMemo, useState } from "react";

type SalesEmailLedgerInput = RouterInputs["emails"]["salesEmailAttempts"];
const SALES_EMAIL_ATTEMPT_STATUSES = [
	"QUEUED",
	"SENDING",
	"SENT",
	"FAILED",
	"SKIPPED",
] as const;
type StatusFilter = "all" | (typeof SALES_EMAIL_ATTEMPT_STATUSES)[number];

type Props = {
	initialSettings?: Partial<TableSettings>;
};

function statusLabel(status: (typeof SALES_EMAIL_ATTEMPT_STATUSES)[number]) {
	switch (status) {
		case "QUEUED":
			return "Queued";
		case "SENDING":
			return "Sending";
		case "SENT":
			return "Sent";
		case "FAILED":
			return "Failed";
		case "SKIPPED":
			return "Skipped";
		default:
			return status;
	}
}

export function SalesEmailLedgerPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);
	const [pageInfo, setPageInfo] = useState<SalesEmailLedgerPageInfo | null>(
		null,
	);
	const size = 25;

	const filters = useMemo(
		() =>
			({
				q: search.trim() || undefined,
				status: status === "all" ? undefined : status,
				page,
				size,
			}) satisfies SalesEmailLedgerInput,
		[page, search, status],
	);
	const hasFilters = Boolean(search.trim()) || status !== "all";

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.emails.salesEmailAttempts.pathKey(),
		});
	};

	const resendMutation = useMutation(
		trpc.emails.resendSalesEmailAttempt.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({
					title: "Email resend queued",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to resend email",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const clearFilters = () => {
		setSearch("");
		setStatus("all");
		setPage(1);
	};

	const isResendingAttemptId =
		resendMutation.isPending && resendMutation.variables
			? resendMutation.variables.attemptId
			: null;

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px] lg:flex-1">
					<div className="grid gap-1.5">
						<Label htmlFor="sales-email-ledger-search">Search</Label>
						<div className="relative">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="sales-email-ledger-search"
								value={search}
								onChange={(event) => {
									setPage(1);
									setSearch(event.target.value);
								}}
								placeholder="Recipient, customer, order, or subject"
								className="pl-9"
							/>
						</div>
					</div>
					<div className="grid gap-1.5">
						<Label>Status</Label>
						<Select
							value={status}
							onValueChange={(value) => {
								setPage(1);
								setStatus(value as StatusFilter);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								{SALES_EMAIL_ATTEMPT_STATUSES.map((item) => (
									<SelectItem key={item} value={item}>
										{statusLabel(item)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<SalesEmailLedgerColumnVisibility />
					<Button
						type="button"
						variant="outline"
						onClick={() => void refresh()}
						disabled={pageInfo?.isFetching}
					>
						{pageInfo?.isFetching ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Icons.RefreshCw className="mr-2 size-4" />
						)}
						Refresh
					</Button>
				</div>
			</div>

			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<SalesEmailLedgerSkeleton initialSettings={initialSettings} />
					}
				>
					<DataTable
						initialSettings={initialSettings}
						filters={filters}
						hasFilters={hasFilters}
						isResendingAttemptId={isResendingAttemptId}
						onClearFilters={clearFilters}
						onResend={(attempt: SalesEmailLedgerRow) =>
							resendMutation.mutate({ attemptId: attempt.id })
						}
						onPageInfoChange={setPageInfo}
					/>
				</Suspense>
			</ErrorBoundary>

			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-muted-foreground">
					{pageInfo
						? `${pageInfo.total.toLocaleString()} transaction${
								pageInfo.total === 1 ? "" : "s"
							} • Page ${pageInfo.page} of ${pageInfo.pageCount}`
						: "Loading email transactions"}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1 || pageInfo?.isFetching}
						onClick={() => setPage((value) => Math.max(1, value - 1))}
					>
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={
							Boolean(pageInfo && page >= pageInfo.pageCount) ||
							pageInfo?.isFetching
						}
						onClick={() =>
							setPage((value) =>
								Math.min(pageInfo?.pageCount ?? value, value + 1),
							)
						}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
