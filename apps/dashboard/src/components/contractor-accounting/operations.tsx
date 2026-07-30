"use client";

import { useAuth } from "@/hooks/use-auth";
import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
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
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

export function ContractorAccountingOperations() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const { params, filters, hasFilters, setParams } =
		useContractorAccountingFilterParams();
	const [confirmClose, setConfirmClose] = useState(false);
	const globalDateFilter =
		hasFilters &&
		Boolean(params.dateRange?.length || params.from || params.to) &&
		!params.q &&
		!params.contractorIds?.length &&
		!params.entryTypes?.length &&
		!params.sourceTypes?.length &&
		!params.amountBand &&
		!params.exceptionsOnly;
	const reconcile = useMutation(
		trpc.contractorAccounting.runReconciliation.mutationOptions({
			async onSuccess(result) {
				toast({
					title: result.matches
						? "Reconciliation matched"
						: "Reconciliation needs review",
					description: result.matches
						? "The legacy source and immutable ledger cross-foot exactly."
						: `${result.differences.length} difference${result.differences.length === 1 ? "" : "s"} recorded for review.`,
					variant: result.matches ? "success" : "error",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.contractorAccounting.reconciliationIssues.queryKey(),
				});
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Reconciliation failed",
					description: error.message,
				});
			},
		}),
	);
	const closePeriod = useMutation(
		trpc.contractorAccounting.closePeriod.mutationOptions({
			async onSuccess() {
				setConfirmClose(false);
				toast({
					title: "Accounting period closed",
					description:
						"New entries inside this period are blocked until an authorized reopen.",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.contractorAccounting.periods.queryKey(),
				});
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Period not closed",
					description: error.message,
				});
			},
		}),
	);

	const period = {
		from: filters.from,
		to: filters.to,
		timezone: filters.timezone,
	};
	if (!auth.can?.editJobPayment) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Accounting operations"
					>
						{reconcile.isPending || closePeriod.isPending ? (
							<Icons.Loader2 className="size-4 animate-spin" />
						) : (
							<Icons.MoreHorizontal className="size-4" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72">
					<DropdownMenuLabel>
						<p>Accounting operations</p>
						<p className="mt-1 font-normal text-xs text-muted-foreground">
							Current view: {period.from} through {period.to}
						</p>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={!hasFilters || reconcile.isPending}
						onSelect={() =>
							reconcile.mutate({
								...period,
								contractorIds: filters.contractorIds,
							})
						}
					>
						<Icons.RefreshCcw className="mr-2 size-4" />
						Run reconciliation
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={() => void setParams({ manageAccounting: true })}
					>
						<Icons.Settings className="mr-2 size-4" />
						Open accounting control center
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => void setParams({ managePayoutRuns: true })}
					>
						<Icons.Wallet className="mr-2 size-4" />
						Draft payout runs
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => void setParams({ manageAlerts: true })}
					>
						<Icons.Bell className="mr-2 size-4" />
						Accounting alerts
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={!globalDateFilter || closePeriod.isPending}
						onSelect={() => setConfirmClose(true)}
					>
						<Icons.Lock className="mr-2 size-4" />
						Close filtered period
					</DropdownMenuItem>
					{!globalDateFilter ? (
						<p className="px-2 py-2 text-xs text-muted-foreground">
							Closing requires a date-only filter with no contractor or entry
							filters.
						</p>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Close this accounting period?</AlertDialogTitle>
						<AlertDialogDescription>
							This snapshots {period.from} through {period.to} and blocks new
							effective-dated entries inside the period. Reopening requires
							Super Admin authorization and a reason.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => closePeriod.mutate(period)}
							disabled={closePeriod.isPending}
						>
							{closePeriod.isPending ? "Closing…" : "Close period"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
