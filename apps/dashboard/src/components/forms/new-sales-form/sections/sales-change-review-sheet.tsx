"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";

type ChangeLine = {
	uid: string;
	title: string;
	beforeQty: number;
	afterQty: number;
	quantityDelta: number;
	beforeLineTotal: number;
	afterLineTotal: number;
};

type ChangeReview = {
	analysis: {
		direction: string;
		reviewReasons: Array<"REFUND" | "INBOUND" | "INVENTORY">;
		lines: ChangeLine[];
		beforeGrandTotal: number;
		afterGrandTotal: number;
		totalDelta: number;
	};
	settlement: {
		amountDue: number;
		walletCredit: number;
		paymentAppliedAfter: number;
	};
	commitments: {
		paymentTotal: number;
		paymentCount: number;
		refundablePaymentCount: number;
		allocatedQty: number;
		inboundQty: number;
		productionQty: number;
		fulfilledQty: number;
	};
	blockedLines: Array<{
		uid: string;
		title: string;
		proposedQty: number;
		minimumAllowedQty: number;
	}>;
};

function money(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);
}

export function SalesChangeReviewSheet(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	review: ChangeReview | null;
	isLoading: boolean;
	isSubmitting: boolean;
	onSubmit: () => Promise<void>;
}) {
	const review = props.review;

	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader>
					<SheetTitle>Review sale changes</SheetTitle>
					<SheetDescription>
						Approve this snapshot to commit the changes automatically.
					</SheetDescription>
				</SheetHeader>

				{props.isLoading ? (
					<div className="mt-6 space-y-3">
						<div className="h-20 animate-pulse rounded-xl bg-muted" />
						<div className="h-40 animate-pulse rounded-xl bg-muted" />
					</div>
				) : review ? (
					<div className="mt-6 space-y-5">
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">{review.analysis.direction}</Badge>
							{review.commitments.paymentTotal > 0 ? (
								<Badge variant="secondary">
									{money(review.commitments.paymentTotal)} paid
								</Badge>
							) : null}
							{review.commitments.inboundQty > 0 ? (
								<Badge variant="secondary">
									Inbound {review.commitments.inboundQty}
								</Badge>
							) : null}
							{review.commitments.allocatedQty > 0 ? (
								<Badge variant="secondary">
									Allocated {review.commitments.allocatedQty}
								</Badge>
							) : null}
							{review.commitments.productionQty > 0 ? (
								<Badge variant="secondary">
									Production {review.commitments.productionQty}
								</Badge>
							) : null}
							{review.commitments.fulfilledQty > 0 ? (
								<Badge variant="secondary">
									Fulfilled {review.commitments.fulfilledQty}
								</Badge>
							) : null}
						</div>

						<div className="overflow-hidden rounded-xl border">
							<div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
								<span>Item</span>
								<span>Previous</span>
								<span>New</span>
							</div>
							{review.analysis.lines.map((line) => (
								<div
									key={line.uid}
									className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
								>
									<div className="min-w-0">
										<p className="truncate font-medium">{line.title}</p>
										<p className="text-xs text-muted-foreground">
											{money(line.beforeLineTotal)} →{" "}
											{money(line.afterLineTotal)}
										</p>
									</div>
									<span className="tabular-nums">{line.beforeQty}</span>
									<span
										className={
											line.quantityDelta < 0
												? "font-semibold text-amber-700"
												: "font-semibold text-blue-700"
										}
									>
										{line.afterQty}
									</span>
								</div>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border p-3">
								<p className="text-xs text-muted-foreground">New total</p>
								<p className="mt-1 font-semibold">
									{money(review.analysis.afterGrandTotal)}
								</p>
							</div>
							<div className="rounded-xl border p-3">
								<p className="text-xs text-muted-foreground">Amount due</p>
								<p className="mt-1 font-semibold">
									{money(review.settlement.amountDue)}
								</p>
							</div>
							{review.settlement.walletCredit > 0 ? (
								<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
									<p className="text-xs text-emerald-700">Wallet refund</p>
									<p className="mt-1 font-semibold text-emerald-900">
										{money(review.settlement.walletCredit)}
									</p>
								</div>
							) : null}
						</div>

						{review.blockedLines.length ? (
							<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
								<p className="font-semibold">
									This change cannot be submitted.
								</p>
								{review.blockedLines.map((line) => (
									<p key={line.uid} className="mt-1 text-xs">
										{line.title}: proposed {line.proposedQty}, minimum{" "}
										{line.minimumAllowedQty} already completed or fulfilled.
									</p>
								))}
							</div>
						) : null}

						<Button
							className="w-full"
							disabled={props.isSubmitting || review.blockedLines.length > 0}
							onClick={() => void props.onSubmit()}
						>
							{props.isSubmitting ? "Committing changes…" : "Approve"}
						</Button>
					</div>
				) : (
					<p className="mt-6 text-sm text-muted-foreground">
						No quantity change is ready for review.
					</p>
				)}
			</SheetContent>
		</Sheet>
	);
}
