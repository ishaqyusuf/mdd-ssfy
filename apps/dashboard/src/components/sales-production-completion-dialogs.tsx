"use client";

import {
	type SalesCompletionChoice,
	type SalesCompletionProjectionPresentation,
	formatSalesCompletionDate,
	fromSalesCompletionDateValue,
	toSalesCompletionDateValue,
} from "@/components/sales-completion-presentation";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Field, FieldDescription, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Textarea } from "@gnd/ui/textarea";
import { useState } from "react";

type SalesProductionCompletionDialogsProps = {
	milestone?: "Production" | "Fulfillment";
	projection?: SalesCompletionProjectionPresentation;
	showStatusOnly: boolean;
	canEditStatusOnly: boolean;
	canRunFullWorkflow?: boolean;
	salesOrderCount: number;
	projectionPending: boolean;
	confirmationOpen: boolean;
	choice: SalesCompletionChoice;
	effectiveDate: string;
	markPending: boolean;
	administrativeOverride?: boolean;
	administrativeOverrideReason?: string;
	onConfirmationOpenChange: (open: boolean) => void;
	onChoiceChange: (choice: SalesCompletionChoice) => void;
	onEffectiveDateChange: (value: string) => void;
	onAdministrativeOverrideReasonChange?: (value: string) => void;
	onConfirm: () => void;
	cancellationOpen: boolean;
	cancellationReason: string;
	cancelPending: boolean;
	onCancellationOpenChange: (open: boolean) => void;
	onCancellationReasonChange: (value: string) => void;
	onCancelCompletion: () => void;
};

function EffectiveCompletionDateField({
	effectiveDate,
	idPrefix,
	isFulfillment,
	milestone,
	onEffectiveDateChange,
}: {
	effectiveDate: string;
	idPrefix: string;
	isFulfillment: boolean;
	milestone: "Production" | "Fulfillment";
	onEffectiveDateChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedDate = fromSalesCompletionDateValue(effectiveDate);

	return (
		<Field>
			<FieldLabel htmlFor={`${idPrefix}-effective-date`}>
				Effective completion date
			</FieldLabel>
			<div className="flex items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							id={`${idPrefix}-effective-date`}
							type="button"
							variant="outline"
							className="flex-1 justify-start text-left font-normal"
						>
							<Icons.Calendar data-icon="inline-start" aria-hidden="true" />
							{formatSalesCompletionDate(effectiveDate)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							aria-label={`${milestone} effective completion date`}
							defaultMonth={selectedDate}
							selected={selectedDate}
							onSelect={(date) => {
								onEffectiveDateChange(
									date ? toSalesCompletionDateValue(date) : "",
								);
								if (date) setOpen(false);
							}}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
				{effectiveDate ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => onEffectiveDateChange("")}
						aria-label="Clear effective completion date"
					>
						<Icons.X aria-hidden="true" />
					</Button>
				) : null}
			</div>
			<FieldDescription>
				{isFulfillment ? "Defaults to today. " : ""}Clear the date when the
				real-world date is unknown; GND keeps the recording time separate.
			</FieldDescription>
		</Field>
	);
}

export function SalesProductionCompletionDialogs(
	props: SalesProductionCompletionDialogsProps,
) {
	const milestone = props.milestone ?? "Production";
	const isFulfillment = milestone === "Fulfillment";
	const isBulk = props.salesOrderCount > 1;
	const idPrefix = milestone.toLowerCase();
	const administrativeOverride = props.administrativeOverride === true;
	const statusOnlyAvailable =
		props.canEditStatusOnly &&
		(administrativeOverride ||
			isBulk ||
			(!props.projectionPending &&
				Boolean(
					isFulfillment
						? props.projection?.availableActions?.markFulfillmentStatusOnly
						: props.projection?.availableActions?.markProductionStatusOnly,
				)));
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
						<AlertDialog.Title>
							{administrativeOverride
								? `Resolve lifecycle exception as ${milestone} completed`
								: `Mark ${milestone} completed`}
						</AlertDialog.Title>
						<AlertDialog.Description>
							{administrativeOverride
								? `Acknowledge the lifecycle exception and record an audited status-only ${milestone.toLowerCase()} milestone${isBulk ? ` for ${props.salesOrderCount} selected orders` : ""}.`
								: `Choose how GND should record ${milestone} completion${isBulk ? ` for ${props.salesOrderCount} selected orders` : ""}. Full workflow is selected by default.`}
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
						{!administrativeOverride ? (
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
						) : null}
						{props.showStatusOnly || administrativeOverride ? (
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
										{administrativeOverride
											? "Record milestone only"
											: "Update status only"}
									</span>
									<span className="mt-1 block text-sm text-muted-foreground">
										{administrativeOverride
											? "Resolve the unavailable or conflicting lifecycle headline without inventing production, dispatch, delivery, inventory, or accounting facts."
											: `Record work that happened outside GND without creating missing operational assignments or ${milestone} workflow records.`}
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
									This records milestone status{isBulk ? "es" : ""} only
								</AlertTitle>
								<AlertDescription>
									{isFulfillment
										? "No delivery proof, inventory commitment, dispatch, shipment, tax, accounting, notification, commission, payout, or external-integration operation will run. Use this only when real-world fulfillment happened outside GND."
										: "No inventory, accounting, notification, commission, payout, dispatch, or external-integration operation will run. Use this only when Production really finished but its workflow history is absent."}
								</AlertDescription>
							</Alert>
							{isBulk || props.projection?.isRecentOrder ? (
								<Alert>
									<Icons.AlertTriangle />
									<AlertTitle>
										{isBulk
											? "This selection may include recent orders"
											: "This is a recent order"}
									</AlertTitle>
									<AlertDescription>
										Confirm that the work happened outside GND before bypassing
										the normal {milestone} workflow.
									</AlertDescription>
								</Alert>
							) : null}
							<EffectiveCompletionDateField
								effectiveDate={props.effectiveDate}
								idPrefix={idPrefix}
								isFulfillment={isFulfillment}
								milestone={milestone}
								onEffectiveDateChange={props.onEffectiveDateChange}
							/>
							{administrativeOverride ? (
								<label
									className="block space-y-1.5"
									htmlFor={`${idPrefix}-administrative-override-reason`}
								>
									<span className="text-sm font-medium">Reason (required)</span>
									<Textarea
										id={`${idPrefix}-administrative-override-reason`}
										maxLength={500}
										value={props.administrativeOverrideReason ?? ""}
										onChange={(event) =>
											props.onAdministrativeOverrideReasonChange?.(
												event.target.value,
											)
										}
										placeholder="Why should this lifecycle exception be overridden?"
									/>
								</label>
							) : null}
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
								(props.choice === "STATUS_ONLY" && !statusOnlyAvailable) ||
								(administrativeOverride &&
									!(props.administrativeOverrideReason ?? "").trim())
							}
							onClick={(event) => {
								event.preventDefault();
								props.onConfirm();
							}}
						>
							{props.markPending
								? "Recording..."
								: props.choice === "STATUS_ONLY"
									? administrativeOverride
										? `Confirm ${milestone} completed`
										: "Record status only"
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
