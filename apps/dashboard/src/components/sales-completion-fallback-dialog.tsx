"use client";

import { EffectiveCompletionDateField } from "@/components/sales-production-completion-dialogs";
import type { SalesCompletionFallbackPreview } from "@gnd/sales/sales-completion-fallback";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { Textarea } from "@gnd/ui/textarea";

type SalesCompletionFallbackDialogProps = {
	open: boolean;
	milestone: "Production" | "Fulfillment";
	preview?: SalesCompletionFallbackPreview;
	previewPending: boolean;
	previewError?: boolean;
	submitPending: boolean;
	reason: string;
	effectiveDate: string;
	onOpenChange: (open: boolean) => void;
	onReasonChange: (reason: string) => void;
	onEffectiveDateChange: (value: string) => void;
	onRetryPreview?: () => void;
	onConfirm: () => void;
};

export function SalesCompletionFallbackDialog(
	props: SalesCompletionFallbackDialogProps,
) {
	const eligibleItems =
		props.preview?.items.filter((item) => item.eligible) ?? [];
	const blockedItems =
		props.preview?.items.filter((item) => !item.eligible) ?? [];
	const pending = props.previewPending || props.submitPending;

	return (
		<AlertDialog
			open={props.open}
			onOpenChange={(open) => {
				if (!pending) props.onOpenChange(open);
			}}
		>
			<AlertDialog.Content className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-xl">
				<AlertDialog.Header>
					<AlertDialog.Title>
						Full workflow could not complete every order
					</AlertDialog.Title>
					<AlertDialog.Description>
						Review the unsuccessful {props.milestone.toLowerCase()} results.
						Only eligible failed orders below can be recorded as status only;
						successful orders will not run again.
					</AlertDialog.Description>
				</AlertDialog.Header>

				{props.previewPending ? (
					<div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
						<Icons.spinner className="size-4 animate-spin" aria-hidden="true" />
						Verifying current order status and revisions…
					</div>
				) : null}

				{props.previewError && !props.previewPending ? (
					<Alert variant="destructive">
						<Icons.AlertTriangle aria-hidden="true" />
						<AlertTitle>Unable to verify the unsuccessful orders</AlertTitle>
						<AlertDescription>
							The saved full-workflow attempt is still available. Retry the
							verification now. Dismissing the saved attempt removes this
							follow-up from the queue without changing any order.
							<Button
								type="button"
								variant="outline"
								className="mt-3"
								onClick={props.onRetryPreview}
							>
								Retry verification
							</Button>
						</AlertDescription>
					</Alert>
				) : null}

				{eligibleItems.length ? (
					<div
						className="space-y-2"
						aria-label="Eligible status-only fallback orders"
					>
						<div className="text-sm font-medium">
							Eligible for status-only follow-up ({eligibleItems.length})
						</div>
						{eligibleItems.map((item) => (
							<div
								key={item.salesOrderId}
								className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20"
							>
								<div className="font-medium">
									{item.orderNo || `Order ${item.salesOrderId}`}
								</div>
								<div className="mt-1 text-muted-foreground">{item.reason}</div>
							</div>
						))}
					</div>
				) : null}

				{blockedItems.length ? (
					<Alert>
						<Icons.Info aria-hidden="true" />
						<AlertTitle>
							{blockedItems.length} unsuccessful order
							{blockedItems.length === 1 ? " is" : "s are"} not eligible
						</AlertTitle>
						<AlertDescription>
							<ul className="mt-2 space-y-2">
								{blockedItems.map((item) => (
									<li key={item.salesOrderId}>
										<span className="font-medium text-foreground">
											{item.orderNo || `Order ${item.salesOrderId}`}
										</span>
										<span className="block">
											Workflow outcome: {item.reason}
										</span>
										<span className="block">
											Fallback unavailable:{" "}
											{item.blockedReason || "current state is unsupported"}
										</span>
									</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				) : null}

				{props.preview && !props.previewPending && !eligibleItems.length ? (
					<Alert>
						<Icons.Info aria-hidden="true" />
						<AlertTitle>No orders are eligible for status only</AlertTitle>
						<AlertDescription>
							The orders may have changed or already completed after the full
							workflow attempt. Nothing will be changed.
						</AlertDescription>
					</Alert>
				) : null}

				{eligibleItems.length ? (
					<>
						<Alert variant="destructive">
							<Icons.AlertTriangle aria-hidden="true" />
							<AlertTitle>Proceed with status only?</AlertTitle>
							<AlertDescription>
								This records the {props.milestone.toLowerCase()} milestone only.
								It will not repeat workflow effects or create production,
								inventory, packing, dispatch, delivery, payment, or accounting
								evidence.
							</AlertDescription>
						</Alert>
						<EffectiveCompletionDateField
							effectiveDate={props.effectiveDate}
							idPrefix="status-only-fallback"
							isFulfillment={props.milestone === "Fulfillment"}
							milestone={props.milestone}
							onEffectiveDateChange={props.onEffectiveDateChange}
							description="Clear the date when the real-world completion date is unknown."
						/>
						<label
							className="block space-y-1.5"
							htmlFor="status-only-fallback-reason"
						>
							<span className="text-sm font-medium">Reason (required)</span>
							<Textarea
								id="status-only-fallback-reason"
								maxLength={500}
								value={props.reason}
								onChange={(event) => props.onReasonChange(event.target.value)}
								placeholder="Why should these unsuccessful orders be recorded as status only?"
							/>
						</label>
					</>
				) : null}

				<AlertDialog.Footer>
					<AlertDialog.Cancel disabled={pending}>
						{props.previewError
							? "Dismiss saved attempt"
							: eligibleItems.length
								? "Leave unsuccessful orders unchanged"
								: "Close"}
					</AlertDialog.Cancel>
					{eligibleItems.length ? (
						<AlertDialog.Action
							disabled={pending || !props.reason.trim()}
							onClick={(event) => {
								event.preventDefault();
								props.onConfirm();
							}}
						>
							{props.submitPending
								? "Recording status only…"
								: `Proceed with status only (${eligibleItems.length})`}
						</AlertDialog.Action>
					) : null}
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog>
	);
}
