"use client";

import {
	applySalesDocumentReadinessRepairAction,
	discardSalesDocumentReadinessProposalAction,
} from "@/actions/resolve-sales-document-access";
import { useSalesDocumentReadinessStore } from "@/store/sales-document-readiness";
import { salesFormUrl } from "@/utils/sales-utils";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

function money(cents: number | null) {
	if (cents === null) return "Not available";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function SalesDocumentReadinessModal() {
	const router = useRouter();
	const readiness = useSalesDocumentReadinessStore((state) => state.readiness);
	const continuation = useSalesDocumentReadinessStore(
		(state) => state.continuation,
	);
	const cancellation = useSalesDocumentReadinessStore(
		(state) => state.cancellation,
	);
	const close = useSalesDocumentReadinessStore((state) => state.close);
	const [isRepairing, setIsRepairing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!readiness) return null;
	const canRepair =
		readiness.status === "repair_required" &&
		Boolean(readiness.proposalId) &&
		!readiness.financial.totalChanged;
	const needsFinancialReview = readiness.status === "financial_review";
	const financialRows = [
		{
			label: "Subtotal",
			saved: readiness.financial.saved.subTotalCents,
			candidate: readiness.financial.candidate.subTotalCents,
			delta: readiness.financial.subTotalDeltaCents,
		},
		{
			label: "Taxable subtotal",
			saved: readiness.financial.saved.taxableSubTotalCents,
			candidate: readiness.financial.candidate.taxableSubTotalCents,
			delta: readiness.financial.taxableSubTotalDeltaCents,
		},
		{
			label: "Tax",
			saved: readiness.financial.saved.taxCents,
			candidate: readiness.financial.candidate.taxCents,
			delta: readiness.financial.taxDeltaCents,
		},
		{
			label: "Grand total",
			saved: readiness.financial.saved.grandTotalCents,
			candidate: readiness.financial.candidate.grandTotalCents,
			delta: readiness.financial.grandTotalDeltaCents,
		},
		{
			label: "Amount due",
			saved: readiness.financial.saved.amountDueCents,
			candidate: readiness.financial.candidate.amountDueCents,
			delta: readiness.financial.amountDueDeltaCents,
		},
	];
	const title = canRepair
		? "Repair needed before continuing"
		: needsFinancialReview
			? "Critical financial review required"
			: "Manual sales review required";

	async function repairAndContinue() {
		if (!readiness || !canRepair || !readiness.proposalId) return;
		setIsRepairing(true);
		setError(null);
		try {
			await applySalesDocumentReadinessRepairAction({
				salesOrderId: readiness.salesOrderId,
				proposalId: readiness.proposalId,
			});
			close();
			await continuation?.();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to apply this repair. Please open the order to review it.",
			);
		} finally {
			setIsRepairing(false);
		}
	}

	async function openOrder() {
		setIsRepairing(true);
		setError(null);
		try {
			if (readiness.proposalId) {
				await discardSalesDocumentReadinessProposalAction({
					salesOrderId: readiness.salesOrderId,
					proposalId: readiness.proposalId,
					disposition: "open_order",
				});
			}
			await cancellation?.();
			const href = salesFormUrl(readiness.salesType, readiness.orderNo, true);
			close();
			router.push(href);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to open this sales document for repair.",
			);
		} finally {
			setIsRepairing(false);
		}
	}

	async function cancelAndClose() {
		setIsRepairing(true);
		setError(null);
		try {
			if (readiness.proposalId) {
				await discardSalesDocumentReadinessProposalAction({
					salesOrderId: readiness.salesOrderId,
					proposalId: readiness.proposalId,
					disposition: "cancelled",
				});
			}
			await cancellation?.();
			close();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to clear this repair proposal. Please try again.",
			);
		} finally {
			setIsRepairing(false);
		}
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !isRepairing) void cancelAndClose();
			}}
		>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Sales {readiness.orderNo} has saved details that do not fully match
						its item records.
					</DialogDescription>
				</DialogHeader>

				<Alert variant={canRepair ? "default" : "destructive"}>
					<Icons.AlertCircle className="size-4" />
					<AlertTitle>
						{canRepair
							? `Invoice total remains ${money(readiness.financial.saved.grandTotalCents)}`
							: "Do not send or print this document until it is reviewed"}
					</AlertTitle>
					<AlertDescription>
						{canRepair
							? "The repair synchronizes item quantity and total summaries with their active rows. It will not change the saved subtotal, tax, grand total, amount paid, or balance."
							: "The current item calculation does not match the saved financial summary. Open the order to review the exact items and recalculate before saving."}
					</AlertDescription>
				</Alert>

				<div className="overflow-x-auto rounded-lg border bg-muted/20 text-sm">
					<div className="grid min-w-[34rem] grid-cols-4 gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
						<span>Amount</span>
						<span>Saved</span>
						<span>Reconciled</span>
						<span>Difference</span>
					</div>
					{financialRows.map((row) => (
						<div
							key={row.label}
							className="grid min-w-[34rem] grid-cols-4 gap-2 border-b px-4 py-2 last:border-b-0"
						>
							<span className="font-medium">{row.label}</span>
							<span>{money(row.saved)}</span>
							<span>{money(row.candidate)}</span>
							<span
								className={
									row.delta === 0
										? "font-medium text-emerald-700"
										: "font-semibold text-destructive"
								}
							>
								{money(row.delta)}
							</span>
						</div>
					))}
				</div>

				{readiness.findings.length ? (
					<div className="space-y-2">
						<p className="text-sm font-medium">What was found</p>
						<ul className="space-y-1 text-sm text-muted-foreground">
							{readiness.findings.map((finding, index) => (
								<li
									key={`${finding.kind}-${finding.salesOrderItemId ?? index}`}
								>
									• {finding.message}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={cancelAndClose}
						disabled={isRepairing}
					>
						Cancel
					</Button>
					<Button variant="outline" onClick={openOrder} disabled={isRepairing}>
						Open {readiness.salesType}
					</Button>
					{canRepair ? (
						<Button onClick={repairAndContinue} disabled={isRepairing}>
							{isRepairing ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Repair &amp; continue
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
