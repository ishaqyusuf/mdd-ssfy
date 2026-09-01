"use client";

import type {
	SalesCompletionChoice,
	SalesCompletionProjectionPresentation,
} from "@/components/sales-completion-presentation";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { AlertDialog } from "@gnd/ui/namespace";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Textarea } from "@gnd/ui/textarea";

type SalesProductionCompletionDialogsProps = {
	milestone?: "Production" | "Fulfillment";
	projection?: SalesCompletionProjectionPresentation;
	showStatusOnly: boolean;
	canEditStatusOnly: boolean;
	canRunFullWorkflow?: boolean;
	projectionPending: boolean;
	confirmationOpen: boolean;
	choice: SalesCompletionChoice;
	effectiveDate: string;
	markPending: boolean;
	onConfirmationOpenChange: (open: boolean) => void;
	onChoiceChange: (choice: SalesCompletionChoice) => void;
	onEffectiveDateChange: (value: string) => void;
	onConfirm: () => void;
	cancellationOpen: boolean;
	cancellationReason: string;
	cancelPending: boolean;
	onCancellationOpenChange: (open: boolean) => void;
	onCancellationReasonChange: (value: string) => void;
	onCancelCompletion: () => void;
};

export function SalesProductionCompletionDialogs(
	props: SalesProductionCompletionDialogsProps,
) {
	const milestone = props.milestone ?? "Production";
	const isFulfillment = milestone === "Fulfillment";
	const idPrefix = milestone.toLowerCase();
	const statusOnlyAvailable =
		props.canEditStatusOnly &&
		!props.projectionPending &&
		Boolean(
			isFulfillment
				? props.projection?.availableActions?.markFulfillmentStatusOnly
				: props.projection?.availableActions?.markProductionStatusOnly,
		);
	const completionRecord = isFulfillment
		? props.projection?.activeFulfillmentRecord
		: props.projection?.activeProductionRecord;
	const activeRecord =
		completionRecord?.completionMethod === "STATUS_ONLY"
			? completionRecord
			: null;
	const cancellationAvailable = Boolean(
		isFulfillment
			? props.projection?.availableActions?.cancelFulfillmentStatusOnly
			: props.projection?.availableActions?.cancelProductionStatusOnly,
	);

	return (
		<>
			<AlertDialog
				open={props.confirmationOpen}
				onOpenChange={(open) => {
					if (!props.markPending) props.onConfirmationOpenChange(open);
				}}
			>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Mark {milestone} completed</AlertDialog.Title>
						<AlertDialog.Description>
							Choose how GND should record {milestone} completion. Full workflow
							is selected by default.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<RadioGroup
						value={props.choice}
						onValueChange={(value) => {
							if (value === "FULL_WORKFLOW" || value === "STATUS_ONLY") {
								props.onChoiceChange(value);
							}
						}}
						className="gap-3"
					>
						<label
							htmlFor={`${idPrefix}-completion-full-workflow`}
							className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40"
						>
							<RadioGroupItem
								id={`${idPrefix}-completion-full-workflow`}
								value="FULL_WORKFLOW"
								className="mt-0.5"
								disabled={props.canRunFullWorkflow === false}
							/>
							<span>
								<span className="block text-sm font-medium">
									Complete full workflow
								</span>
								<span className="mt-1 block text-sm text-muted-foreground">
									Run the existing stage-wise {milestone} process and all
									applicable business effects.
								</span>
								{props.canRunFullWorkflow === false ? (
									<span className="mt-2 block text-xs text-amber-700 dark:text-amber-300">
										Full-workflow permission is required for this choice.
									</span>
								) : null}
							</span>
						</label>
						{props.showStatusOnly ? (
							<label
								htmlFor={`${idPrefix}-completion-status-only`}
								className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[[data-state=checked]]:border-amber-500 has-[[data-state=checked]]:bg-amber-50/60 has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-60 dark:has-[[data-state=checked]]:bg-amber-950/20"
							>
								<RadioGroupItem
									id={`${idPrefix}-completion-status-only`}
									value="STATUS_ONLY"
									className="mt-0.5"
									disabled={!statusOnlyAvailable}
								/>
								<span>
									<span className="block text-sm font-medium">
										Update status only
									</span>
									<span className="mt-1 block text-sm text-muted-foreground">
										Record work that happened outside GND without creating
										missing operational assignments or {milestone} workflow
										records.
									</span>
									{!props.canEditStatusOnly ? (
										<span className="mt-2 block text-xs text-amber-700 dark:text-amber-300">
											Edit permission is required to submit this choice.
										</span>
									) : null}
								</span>
							</label>
						) : null}
					</RadioGroup>
					{props.choice === "STATUS_ONLY" ? (
						<div className="space-y-3">
							<Alert variant="destructive">
								<Icons.AlertTriangle />
								<AlertTitle>
									This records an administrative milestone only
								</AlertTitle>
								<AlertDescription>
									{isFulfillment
										? "No delivery proof, inventory commitment, dispatch, shipment, tax, accounting, notification, commission, payout, or external-integration operation will run. Use this only when real-world fulfillment happened outside GND."
										: "No inventory, accounting, notification, commission, payout, dispatch, or external-integration operation will run. Use this only when Production really finished but its workflow history is absent."}
								</AlertDescription>
							</Alert>
							{props.projection?.isRecentOrder ? (
								<Alert>
									<Icons.AlertTriangle />
									<AlertTitle>This is a recent order</AlertTitle>
									<AlertDescription>
										Confirm that the work happened outside GND before bypassing
										the normal {milestone} workflow.
									</AlertDescription>
								</Alert>
							) : null}
							<label
								className="block space-y-1.5"
								htmlFor={`${idPrefix}-effective-date`}
							>
								<span className="text-sm font-medium">
									Effective completion date (optional)
								</span>
								<Input
									id={`${idPrefix}-effective-date`}
									type="date"
									value={props.effectiveDate}
									onChange={(event) =>
										props.onEffectiveDateChange(event.target.value)
									}
								/>
								<span className="block text-xs text-muted-foreground">
									Leave empty when the real-world date is unknown. GND keeps the
									recording time separate.
								</span>
							</label>
						</div>
					) : null}
					<AlertDialog.Footer>
						<AlertDialog.Cancel disabled={props.markPending}>
							Cancel
						</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={
								props.markPending ||
								(props.choice === "FULL_WORKFLOW" &&
									props.canRunFullWorkflow === false) ||
								(props.choice === "STATUS_ONLY" && !statusOnlyAvailable)
							}
							onClick={(event) => {
								event.preventDefault();
								props.onConfirm();
							}}
						>
							{props.markPending
								? "Recording..."
								: props.choice === "STATUS_ONLY"
									? "Record status only"
									: "Continue full workflow"}
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>

			<AlertDialog
				open={props.cancellationOpen}
				onOpenChange={(open) => {
					if (!props.cancelPending) props.onCancellationOpenChange(open);
				}}
			>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>
							Cancel {milestone} status-only completion?
						</AlertDialog.Title>
						<AlertDialog.Description>
							This preserves the declaration and adds cancellation provenance.
							It does not reverse operational work.
						</AlertDialog.Description>
					</AlertDialog.Header>
					{activeRecord ? (
						<div className="rounded-md border bg-muted/30 p-3 text-sm">
							<div className="font-medium">
								{milestone} completed — status only
							</div>
							<div className="mt-1 text-muted-foreground">
								Recorded by{" "}
								{activeRecord.recordedBy?.name ||
									`User ${activeRecord.recordedBy?.id ?? "unknown"}`}{" "}
								on {new Date(activeRecord.recordedAt ?? "").toLocaleString()}.
							</div>
							<div className="mt-1 text-muted-foreground">
								{activeRecord.effectiveAt
									? `Effective date: ${new Date(activeRecord.effectiveAt).toLocaleDateString()}`
									: "Effective date unknown"}
							</div>
						</div>
					) : null}
					<label
						className="block space-y-1.5"
						htmlFor="status-only-cancellation-reason"
					>
						<span className="text-sm font-medium">Reason (optional)</span>
						<Textarea
							id="status-only-cancellation-reason"
							maxLength={500}
							value={props.cancellationReason}
							onChange={(event) =>
								props.onCancellationReasonChange(event.target.value)
							}
							placeholder="Why is this administrative declaration being cancelled?"
						/>
					</label>
					{!isFulfillment &&
					props.projection?.availableActions
						?.productionCancellationBlockedReason ? (
						<Alert variant="destructive">
							<Icons.AlertTriangle />
							<AlertTitle>Cancellation is blocked</AlertTitle>
							<AlertDescription>
								{
									props.projection.availableActions
										.productionCancellationBlockedReason
								}
							</AlertDescription>
						</Alert>
					) : null}
					<AlertDialog.Footer>
						<AlertDialog.Cancel disabled={props.cancelPending}>
							Keep completion
						</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={
								props.cancelPending ||
								!props.canEditStatusOnly ||
								!cancellationAvailable
							}
							onClick={(event) => {
								event.preventDefault();
								props.onCancelCompletion();
							}}
						>
							{props.cancelPending
								? "Cancelling..."
								: "Cancel status-only completion"}
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}
