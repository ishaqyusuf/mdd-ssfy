"use client";

import { applySalesDocumentReadinessRepairAction } from "@/actions/resolve-sales-document-access";
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
	const close = useSalesDocumentReadinessStore((state) => state.close);
	const [isRepairing, setIsRepairing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!readiness) return null;
	const canRepair =
		readiness.status === "repair_required" &&
		Boolean(readiness.proposalId) &&
		!readiness.financial.totalChanged;
	const needsFinancialReview = readiness.status === "financial_review";
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

	function openOrder() {
		const href = salesFormUrl(
			readiness.salesType,
			readiness.orderNo,
			true,
		);
		close();
		router.push(href);
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !isRepairing) close();
			}}
		>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Sales {readiness.orderNo} has saved details that do not fully
						match its item records.
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
							? "The repair only restores missing item quantity and total summaries. It will not change the saved subtotal, tax, grand total, amount paid, or balance."
							: "The current item calculation does not match the saved financial summary. Open the order to review the exact items and recalculate before saving."}
					</AlertDescription>
				</Alert>

				<div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
					<div>
						<p className="text-xs text-muted-foreground">Saved subtotal</p>
						<p className="font-medium">
							{money(readiness.financial.saved.subTotalCents)}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">
							Reconciled subtotal
						</p>
						<p className="font-medium">
							{money(readiness.financial.candidate.subTotalCents)}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">Difference</p>
						<p
							className={
								readiness.financial.totalChanged
									? "font-semibold text-destructive"
									: "font-medium text-emerald-700"
							}
						>
							{money(readiness.financial.subTotalDeltaCents)}
						</p>
					</div>
				</div>

				{readiness.findings.length ? (
					<div className="space-y-2">
						<p className="text-sm font-medium">What was found</p>
						<ul className="space-y-1 text-sm text-muted-foreground">
							{readiness.findings.map((finding, index) => (
								<li key={`${finding.kind}-${finding.salesOrderItemId ?? index}`}>
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
					<Button variant="ghost" onClick={close} disabled={isRepairing}>
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

