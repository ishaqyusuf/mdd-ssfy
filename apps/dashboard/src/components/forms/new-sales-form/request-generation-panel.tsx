"use client";

import { RequestClarificationQuestionnaire } from "./request-clarification-questionnaire";
import type { SalesRequestClarificationAnswer } from "./request-generation-controller";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Textarea } from "@gnd/ui/textarea";
import { type ReactNode, useMemo, useState } from "react";
import { useNewSalesFormStepRoutingQuery } from "./api";
import type {
	SalesRequestGenerationApplyResult,
	SalesRequestGenerationConfigurationValidator,
} from "./request-generation-apply";
import type {
	SalesRequestGenerationFailure,
	SalesRequestGenerationSnapshot,
} from "./request-generation-controller";
import {
	SALES_REQUEST_CHANGED_FIELD_CATEGORY_OPTIONS,
	SALES_REQUEST_FEEDBACK_OUTCOMES,
	SALES_REQUEST_ISSUE_CATEGORY_OPTIONS,
	type SalesRequestChangedFieldCategory,
	type SalesRequestFeedbackOutcome,
	type SalesRequestGenerationFeedbackSelection,
	type SalesRequestIssueCategory,
} from "./request-generation-outcome";
import {
	type SalesRequestReviewDefault,
	type SalesRequestReviewHptRow,
	type SalesRequestReviewLine,
	type SalesRequestReviewModel,
	type SalesRequestReviewMouldingRow,
	type SalesRequestReviewServiceRow,
	type SalesRequestReviewUnresolved,
	type SalesRequestReviewWarning,
	buildSalesRequestReviewModel,
} from "./request-generation-presentation";
import type { UndoRequestGenerationProposalResult } from "./request-generation-transaction";
import {
	type UseSalesRequestGenerationApplyOptions,
	useSalesRequestGenerationApply,
} from "./use-request-generation-apply";
import { useSalesRequestGenerationController } from "./use-request-generation-controller";

const MAX_SOURCE_LENGTH = 20_000;

type GenerationSnapshotProps = Pick<
	SalesRequestGenerationSnapshot,
	"sourceText" | "status" | "result" | "failure" | "isStale" | "canRetry"
>;

export type SalesRequestGenerationPanelViewProps = GenerationSnapshotProps & {
	model: SalesRequestReviewModel | null;
    clarification?: SalesRequestGenerationSnapshot["clarification"];
    clarificationHistory?: SalesRequestGenerationSnapshot["clarificationHistory"];
    onAnswerQuestions?: (answers: SalesRequestClarificationAnswer[]) => void;
	setSourceText: (value: string) => void;
	onGenerate: () => void;
	onCancel: () => void;
	onClear: () => void;
	onRetry: () => void;
	canInspectJson?: boolean;
	routingPending?: boolean;
	routingError?: boolean;
	applyDisabled?: boolean;
	applyDisabledReason?: string | null;
	applyResult?: SalesRequestGenerationApplyResult | null;
	applyMessage?: string | null;
	isApplying?: boolean;
	onApply?: () => void;
	undoAvailability?: "none" | "full" | "selective";
	undoResult?: UndoRequestGenerationProposalResult | null;
	undoMessage?: string | null;
	isUndoing?: boolean;
	onUndo?: () => void;
	generateDisabled?: boolean;
	onSubmitFeedback?: (
		generationId: string,
		input: SalesRequestGenerationFeedbackSelection,
	) => Promise<boolean>;
};

export type SalesRequestGenerationPanelProps = {
	type: "order" | "quote";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formRevision?: string | number | null;
	configurationRevision?: string | null;
	canInspectJson?: boolean;
	validateConfigurationRevision?: SalesRequestGenerationConfigurationValidator;
	onBeforeApply?: () => void;
	onApplyResult?: UseSalesRequestGenerationApplyOptions["onApplyResult"];
	onUndoResult?: UseSalesRequestGenerationApplyOptions["onUndoResult"];
	onSubmitFeedback?: (
		generationId: string,
		input: SalesRequestGenerationFeedbackSelection,
	) => Promise<boolean>;
	generateDisabled?: boolean;
};

const APPLY_DISABLED_MESSAGES: Record<string, string> = {
	"missing-preview": "Generate a preview before applying.",
	"missing-record": "The current form is not ready.",
	"missing-proposal": "Generate a new preview before applying.",
	"routing-pending": "Loading the current catalog…",
	"routing-error": "The current catalog could not be loaded.",
	"route-unavailable": "The current sales workflow could not be loaded.",
	"stale-preview": "Generate again because the form or configuration changed.",
	"blocking-review": "Resolve every blocking item before applying.",
	"profile-loading": "Loading the selected customer profile…",
	"profile-error": "The selected customer profile could not be loaded.",
	"persisted-record": "Apply is available only while creating a new sale.",
	"configuration-validator-required":
		"Apply is unavailable until the current sales configuration is verified.",
	"proposal-rejected":
		"This proposal was rejected. Generate a new preview before applying.",
	applying: "Applying the proposal…",
};

function applyDisabledMessage(reason?: string | null) {
	return reason ? APPLY_DISABLED_MESSAGES[reason] || reason : null;
}

function formatNumber(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(value);
}

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

function ReviewBucket<T>({
	title,
	description,
	items,
	empty,
	renderItem,
	getKey,
	tone,
}: {
	title: string;
	description: string;
	items: T[];
	empty: string;
	renderItem: (item: T) => ReactNode;
	getKey: (item: T) => string;
	tone: "danger" | "warning" | "neutral";
}) {
	const toneClass =
		tone === "danger"
			? "border-red-200 bg-red-50/70"
			: tone === "warning"
				? "border-amber-200 bg-amber-50/70"
				: "border-border bg-muted/20";
	return (
		<section
			aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-title`}
			className={`rounded-lg border p-4 ${toneClass}`}
		>
			<h3
				id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}
				className="font-semibold"
			>
				{title}
			</h3>
			<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			{items.length ? (
				<ul className="mt-3 space-y-2 text-sm">
					{items.map((item) => (
						<li key={getKey(item)}>{renderItem(item)}</li>
					))}
				</ul>
			) : (
				<p className="mt-3 text-sm text-muted-foreground">{empty}</p>
			)}
		</section>
	);
}

function SelectionList({ line }: { line: SalesRequestReviewLine }) {
	if (!line.selections.length) return null;
	return (
		<div className="mt-3">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Configured selections
			</h4>
			<ul className="mt-2 divide-y rounded-md border bg-background/70">
				{line.selections.map((selection) => (
					<li
						key={`${line.uid}-${selection.stepId}`}
						className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
					>
						<span className="font-medium">{selection.stepTitle}</span>
						<span className="text-muted-foreground sm:text-right">
							{selection.values.join(", ")}
							{selection.kind === "custom" ? " · Custom value" : ""}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function HptRows({ rows }: { rows: SalesRequestReviewHptRow[] }) {
	if (!rows.length) return null;
	return (
		<div className="mt-4 overflow-x-auto">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				House Package Tool sizes
			</h4>
			<table className="mt-2 w-full min-w-[30rem] text-left text-sm">
				<thead className="border-b text-xs text-muted-foreground">
					<tr>
						<th className="px-2 py-2 font-medium">Size</th>
						<th className="px-2 py-2 font-medium">Handing</th>
						<th className="px-2 py-2 text-right font-medium">Quantity</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{rows.map((row, index) => (
						<tr key={`${row.dimension}-${index}`}>
							<td className="px-2 py-2 font-medium">{row.dimension}</td>
							<td className="px-2 py-2 text-muted-foreground">
								{row.handed || row.swing || "Unhanded"}
							</td>
							<td className="px-2 py-2 text-right">
								{formatNumber(row.quantity)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function MouldingRows({ rows }: { rows: SalesRequestReviewMouldingRow[] }) {
	if (!rows.length) return null;
	return (
		<div className="mt-4 overflow-x-auto">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Mouldings
			</h4>
			<table className="mt-2 w-full min-w-[30rem] text-left text-sm">
				<thead className="border-b text-xs text-muted-foreground">
					<tr>
						<th className="px-2 py-2 font-medium">Profile</th>
						<th className="px-2 py-2 font-medium">Calculation</th>
						<th className="px-2 py-2 text-right font-medium">Quantity</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{rows.map((row, index) => (
						<tr key={`${row.title}-${index}`}>
							<td className="px-2 py-2 font-medium">{row.title}</td>
							<td className="px-2 py-2 text-muted-foreground">
								{row.calculation || "Explicit pieces"}
							</td>
							<td className="px-2 py-2 text-right">
								{formatNumber(row.quantity)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ServiceRows({ rows }: { rows: SalesRequestReviewServiceRow[] }) {
	if (!rows.length) return null;
	return (
		<div className="mt-4">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Services
			</h4>
			<ul className="mt-2 divide-y rounded-md border bg-background/70">
				{rows.map((row, index) => (
					<li
						key={`${row.service}-${index}`}
						className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
					>
						<span>{row.service}</span>
						<span className="font-medium">
							Qty {formatNumber(row.quantity)}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function ReviewLine({
	line,
	index,
}: { line: SalesRequestReviewLine; index: number }) {
	return (
		<article className="rounded-lg border bg-card p-4 shadow-sm">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="font-semibold">Line {index + 1}</h3>
				<span className="text-sm text-muted-foreground">
					Quantity {formatNumber(line.quantity)}
				</span>
			</div>
			<SelectionList line={line} />
			<HptRows rows={line.hptRows} />
			<MouldingRows rows={line.mouldingRows} />
			<ServiceRows rows={line.serviceRows} />
		</article>
	);
}

function UnresolvedItem({ item }: { item: SalesRequestReviewUnresolved }) {
	return (
		<div>
			<p className="font-medium">
				{item.lineLabel} · {item.stepLabel} · {item.field}
			</p>
			<p className="mt-0.5 text-muted-foreground">{item.reason}</p>
		</div>
	);
}

function WarningItem({ item }: { item: SalesRequestReviewWarning }) {
	return (
		<div>
			<p className="font-medium">
				{item.lineLabel} · {item.stepLabel}
			</p>
			<p className="mt-0.5 text-muted-foreground">{item.detail}</p>
		</div>
	);
}

function DefaultItem({ item }: { item: SalesRequestReviewDefault }) {
	return (
		<div>
			<p className="font-medium">
				{item.lineLabel} · {item.stepLabel}
			</p>
			<p className="mt-0.5 text-muted-foreground">{item.value}</p>
		</div>
	);
}

export function SalesRequestReviewContent({
	model,
}: { model: SalesRequestReviewModel }) {
	return (
		<div className="space-y-4" aria-label="Generated request preview">
			<section aria-labelledby="proposed-changes-title">
				<div className="flex items-baseline justify-between gap-2">
					<h2 id="proposed-changes-title" className="font-semibold">
						Proposed changes
					</h2>
					<span className="text-xs text-muted-foreground">
						Preview only · nothing has been added to the form
					</span>
				</div>
				<div className="mt-3 space-y-3">
					{model.lines.length ? (
						model.lines.map((line, index) => (
							<ReviewLine key={line.uid} line={line} index={index} />
						))
					) : (
						<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
							No line items were proposed. Review the unresolved request details
							below.
						</div>
					)}
				</div>
			</section>

			{model.delivery ? (
				<section
					className="rounded-lg border bg-card p-4"
					aria-labelledby="delivery-title"
				>
					<h3 id="delivery-title" className="font-semibold">
						Delivery
					</h3>
					<div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
						<span className="capitalize">{model.delivery.option}</span>
						{model.delivery.amount == null ? null : (
							<span className="text-muted-foreground">
								{formatMoney(model.delivery.amount)} stated delivery charge
							</span>
						)}
					</div>
				</section>
			) : null}

			<ReviewBucket
				title="Needs review"
				description="Compare these details with the original request and finish uncreated work in Sales."
				items={model.unresolved}
				empty="No unresolved details were reported."
				renderItem={(item) => <UnresolvedItem item={item} />}
				getKey={(item) =>
					`${item.lineLabel}:${item.stepLabel}:${item.field}:${item.reason}`
				}
				tone="warning"
			/>
			<ReviewBucket
				title="Warnings"
				description="Check these presentation warnings against the current catalog."
				items={model.warnings}
				empty="No catalog warnings were reported."
				renderItem={(item) => <WarningItem item={item} />}
				getKey={(item) => `${item.lineLabel}:${item.stepLabel}:${item.detail}`}
				tone="warning"
			/>
			<ReviewBucket
				title="Configured defaults"
				description="These omission-only defaults may be supplied by the published sales configuration."
				items={model.defaults}
				empty="No configured defaults were applied to this preview."
				renderItem={(item) => <DefaultItem item={item} />}
				getKey={(item) => `${item.lineLabel}:${item.stepLabel}:${item.value}`}
				tone="neutral"
			/>
		</div>
	);
}

function FailureMessage({
	failure,
}: { failure: SalesRequestGenerationFailure }) {
	return (
		<div
			role="alert"
			className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
		>
			<div className="flex items-start gap-2">
				<Icons.AlertCircle className="mt-0.5 size-4 shrink-0" />
				<div className="min-w-0">
					<p className="font-medium">{failure.message}</p>
					{failure.referenceId ? (
						<p className="mt-1 text-xs opacity-75">
							Reference {failure.referenceId}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function toggleCategory<T extends string>(
	values: readonly T[],
	value: T,
	checked: boolean,
) {
	return checked
		? [...new Set([...values, value])]
		: values.filter((candidate) => candidate !== value);
}

function SalesRequestGenerationFeedback({
	onSubmit,
	onRecorded,
	outcomes,
}: {
	onSubmit: (
		input: SalesRequestGenerationFeedbackSelection,
	) => Promise<boolean>;
	onRecorded?: (outcome: SalesRequestFeedbackOutcome) => void;
	outcomes: readonly (typeof SALES_REQUEST_FEEDBACK_OUTCOMES)[number][];
}) {
	const [outcome, setOutcome] = useState<SalesRequestFeedbackOutcome | null>(
		null,
	);
	const [issueCategories, setIssueCategories] = useState<
		SalesRequestIssueCategory[]
	>([]);
	const [changedFieldCategories, setChangedFieldCategories] = useState<
		SalesRequestChangedFieldCategory[]
	>([]);
	const [status, setStatus] = useState<
		"idle" | "submitting" | "saved" | "error"
	>("idle");
	const needsIssueCategory = outcome === "rejected";
	const needsChangedCategory = outcome === "accepted-with-edits";
	const canSubmit =
		outcome != null &&
		(!needsIssueCategory || issueCategories.length > 0) &&
		(!needsChangedCategory || changedFieldCategories.length > 0);

	async function submit() {
		if (!outcome || !canSubmit || status === "submitting") return;
		setStatus("submitting");
		try {
			const recorded = await onSubmit({
				outcome,
				issueCategories,
				changedFieldCategories,
			});
			setStatus(recorded ? "saved" : "error");
			if (recorded) onRecorded?.(outcome);
		} catch {
			setStatus("error");
		}
	}

	return (
		<section
			className="rounded-lg border bg-muted/20 p-4"
			aria-labelledby="sales-request-generation-feedback-title"
		>
			<h3
				id="sales-request-generation-feedback-title"
				className="font-semibold"
			>
				How accurate was this proposal?
			</h3>
			<p className="mt-1 text-xs text-muted-foreground">
				Share a category-only result. Customer request content is never
				included.
			</p>
			<RadioGroup
				className="mt-3 grid gap-2 sm:grid-cols-3"
				value={outcome ?? undefined}
				onValueChange={(value) => {
					setOutcome(value as SalesRequestFeedbackOutcome);
					setIssueCategories([]);
					setChangedFieldCategories([]);
					setStatus("idle");
				}}
				disabled={status === "saved" || status === "submitting"}
			>
				{outcomes.map((option) => (
					<label
						key={option.value}
						htmlFor={`sales-request-feedback-${option.value}`}
						className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
					>
						<RadioGroupItem
							id={`sales-request-feedback-${option.value}`}
							value={option.value}
						/>
						<span>{option.label}</span>
					</label>
				))}
			</RadioGroup>

			{needsIssueCategory ? (
				<fieldset className="mt-4">
					<legend className="text-sm font-medium">
						What needs improvement?
					</legend>
					<div className="mt-2 grid gap-2 sm:grid-cols-2">
						{SALES_REQUEST_ISSUE_CATEGORY_OPTIONS.map((option) => (
							<label
								key={option.value}
								htmlFor={`sales-request-feedback-issue-${option.value}`}
								className="flex cursor-pointer items-center gap-2 text-sm"
							>
								<Checkbox
									id={`sales-request-feedback-issue-${option.value}`}
									checked={issueCategories.includes(option.value)}
									onCheckedChange={(checked) =>
										setIssueCategories((current) =>
											toggleCategory(current, option.value, checked === true),
										)
									}
								/>
								<span>{option.label}</span>
							</label>
						))}
					</div>
				</fieldset>
			) : null}

			{needsChangedCategory ? (
				<fieldset className="mt-4">
					<legend className="text-sm font-medium">What did you change?</legend>
					<div className="mt-2 grid gap-2 sm:grid-cols-2">
						{SALES_REQUEST_CHANGED_FIELD_CATEGORY_OPTIONS.map((option) => (
							<label
								key={option.value}
								htmlFor={`sales-request-feedback-change-${option.value}`}
								className="flex cursor-pointer items-center gap-2 text-sm"
							>
								<Checkbox
									id={`sales-request-feedback-change-${option.value}`}
									checked={changedFieldCategories.includes(option.value)}
									onCheckedChange={(checked) =>
										setChangedFieldCategories((current) =>
											toggleCategory(current, option.value, checked === true),
										)
									}
								/>
								<span>{option.label}</span>
							</label>
						))}
					</div>
				</fieldset>
			) : null}

			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canSubmit || status === "submitting" || status === "saved"}
					onClick={() => void submit()}
				>
					{status === "submitting" ? "Sending…" : "Send feedback"}
				</Button>
				{status === "saved" ? (
					<output className="text-xs text-emerald-700" aria-live="polite">
						Feedback recorded.
					</output>
				) : status === "error" ? (
					<output className="text-xs text-amber-700" aria-live="polite">
						Feedback could not be recorded. Try again.
					</output>
				) : null}
			</div>
		</section>
	);
}

export function SalesRequestGenerationPanelView(
	props: SalesRequestGenerationPanelViewProps,
) {
	const hasResult = Boolean(props.result && props.model && !props.clarification);
	const isPending = props.status === "pending";
	const modelHasUnresolved = Boolean(props.model?.unresolved.length);
	const [rejectedGenerationId, setRejectedGenerationId] = useState<
		string | null
	>(null);
	const feedbackGenerationId = props.result?.generationId;
	const proposalRejected =
		feedbackGenerationId != null &&
		rejectedGenerationId === feedbackGenerationId;
	const applyDisabled =
		!hasResult ||
		isPending ||
		modelHasUnresolved ||
		proposalRejected ||
		props.applyDisabled === true ||
		!props.onApply;
	const applyHelp = applyDisabledMessage(
		proposalRejected ? "proposal-rejected" : props.applyDisabledReason,
	);
	const applied =
		props.applyResult?.status === "applied" ||
		props.applyResult?.status === "already-applied";
	const feedbackOutcomes = applied
		? SALES_REQUEST_FEEDBACK_OUTCOMES
		: SALES_REQUEST_FEEDBACK_OUTCOMES.filter(
				(option) => option.value === "rejected",
			);
	const submitFeedback = props.onSubmitFeedback;
	return (
		<div
			className="space-y-4"
			data-request-generation-panel="true"
			aria-busy={isPending}
		>
			<div>
				<label
					htmlFor="sales-request-generation-source"
					className="text-sm font-medium"
				>
					Customer request
				</label>
				<p
					id="sales-request-generation-source-help"
					className="mt-1 text-xs text-muted-foreground"
				>
					Paste the customer&apos;s text. The current sale stays unchanged while
					you review.
				</p>
				<Textarea
					id="sales-request-generation-source"
					value={props.sourceText}
					onChange={(event) => props.setSourceText(event.target.value)}
					placeholder="Paste a customer request, door schedule, or scope of work..."
					aria-describedby="sales-request-generation-source-help sales-request-generation-source-count"
					aria-label="Customer request"
					maxLength={MAX_SOURCE_LENGTH}
					rows={6}
					autoFocus
					className="mt-2 min-h-32 resize-y rounded-md border p-3 leading-6"
					disabled={isPending}
				/>
				<div
					id="sales-request-generation-source-count"
					className="mt-1 text-right text-xs text-muted-foreground"
					aria-live="polite"
				>
					{props.sourceText.length} / {MAX_SOURCE_LENGTH} characters
				</div>
			</div>

            {props.clarification && props.onAnswerQuestions ? <RequestClarificationQuestionnaire key={`${props.clarification.sessionId}-${props.clarification.revision}`} clarification={props.clarification} history={props.clarificationHistory ?? []} pending={isPending} stale={props.isStale} onSubmit={props.onAnswerQuestions} /> : null}
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					onClick={props.onGenerate}
					disabled={
						isPending || props.generateDisabled || !props.sourceText.trim() || Boolean(props.clarification && !props.isStale)
					}
				>
					{hasResult ? "Regenerate" : "Generate"}
				</Button>
				{isPending ? (
					<Button type="button" variant="outline" onClick={props.onCancel}>
						Cancel
					</Button>
				) : null}
				<Button
					type="button"
					variant="ghost"
					onClick={props.onClear}
					disabled={!props.sourceText && !props.result && !props.failure}
				>
					Clear
				</Button>
				{hasResult ? (
					<Button
						type="button"
						onClick={props.onApply}
						disabled={applyDisabled || props.isApplying}
						aria-describedby={
							applyHelp ? "sales-request-generation-apply-help" : undefined
						}
					>
						{props.isApplying ? "Applying…" : "Apply to form"}
					</Button>
				) : null}
				{props.undoAvailability && props.undoAvailability !== "none" ? (
					<Button
						type="button"
						variant="outline"
						onClick={props.onUndo}
						disabled={props.isUndoing || !props.onUndo}
						aria-describedby="sales-request-generation-undo-help"
					>
						{props.isUndoing
							? "Undoing…"
							: props.undoAvailability === "full"
								? "Undo applied changes"
								: "Undo generated changes"}
					</Button>
				) : null}
				{props.status === "error" && props.canRetry ? (
					<Button type="button" variant="outline" onClick={props.onRetry}>
						Retry
					</Button>
				) : null}
			</div>
			{hasResult && applyHelp && !props.isApplying ? (
				<p
					id="sales-request-generation-apply-help"
					className="text-xs text-muted-foreground"
				>
					{applyHelp}
				</p>
			) : null}
			{props.undoAvailability && props.undoAvailability !== "none" ? (
				<p
					id="sales-request-generation-undo-help"
					className="text-xs text-muted-foreground"
				>
					{props.undoAvailability === "full"
						? "Undo restores the form to its pre-apply state."
						: "The form changed after Apply; Undo removes only unchanged generated values."}
				</p>
			) : null}
			{props.undoMessage ? (
				<output
					aria-live="polite"
					className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
				>
					{props.undoMessage}
				</output>
			) : null}

			{isPending ? (
				<output
					aria-live="polite"
					className="flex items-center gap-2 text-sm text-muted-foreground"
				>
					<Icons.Loader2 className="size-4 animate-spin" />
					Generating preview…
				</output>
			) : null}
			{props.failure ? <FailureMessage failure={props.failure} /> : null}
			{props.applyMessage ? (
				<output
					aria-live="polite"
					className={`rounded-md border p-3 text-sm ${
						props.applyResult?.status === "error" ||
						props.applyResult?.status === "blocked" ||
						props.applyResult?.status === "configuration-stale"
							? "border-amber-200 bg-amber-50 text-amber-950"
							: "border-emerald-200 bg-emerald-50 text-emerald-950"
					}`}
				>
					{props.applyMessage}
				</output>
			) : null}
			{hasResult &&
			feedbackGenerationId &&
			submitFeedback &&
			props.undoResult?.status !== "restored" &&
			props.undoResult?.status !== "selective-removed" ? (
				<SalesRequestGenerationFeedback
					key={feedbackGenerationId}
					outcomes={feedbackOutcomes}
					onSubmit={(input) => submitFeedback(feedbackGenerationId, input)}
					onRecorded={(outcome) => {
						if (outcome === "rejected") {
							setRejectedGenerationId(feedbackGenerationId);
						}
					}}
				/>
			) : null}
			{props.isStale ? (
				<output
					aria-live="polite"
					className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span>
							<strong>This preview is stale.</strong> The form or sales
							configuration changed.
						</span>
						{!isPending ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={props.onGenerate}
								disabled={props.generateDisabled || !props.sourceText.trim()}
							>
								Generate again
							</Button>
						) : null}
					</div>
				</output>
			) : null}
			{props.routingPending ? (
				<output
					aria-live="polite"
					className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
				>
					Loading authoritative catalog labels…
				</output>
			) : props.routingError ? (
				<div
					role="alert"
					className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
				>
					The current catalog labels could not be loaded. This preview remains
					read-only.
				</div>
			) : hasResult ? (
				<SalesRequestReviewContent
					model={props.model as SalesRequestReviewModel}
				/>
			) : props.status === "idle" || props.status === "cancelled" ? (
				<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
					Paste a request above to generate a reviewable, read-only proposal.
				</div>
			) : null}

			{props.canInspectJson && props.result ? (
				<details className="rounded-lg border bg-muted/20 p-3">
					<summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						Developer seed JSON
					</summary>
					<pre
						aria-label="Seed JSON"
						className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100"
					>
						{JSON.stringify(props.result.seed, null, 2)}
					</pre>
				</details>
			) : null}
		</div>
	);
}

export function SalesRequestGenerationPanel(
	props: SalesRequestGenerationPanelProps,
) {
	const controller = useSalesRequestGenerationController({
		type: props.type,
		formRevision: props.formRevision,
		configurationRevision: props.configurationRevision,
	});
	const routing = useNewSalesFormStepRoutingQuery({}, props.open);
	const model = useMemo(
		() =>
			controller.result && routing.data
				? buildSalesRequestReviewModel(controller.result, routing.data)
				: null,
		[controller.result, routing.data],
	);
	const apply = useSalesRequestGenerationApply({
		type: props.type,
		open: props.open,
		preview: controller.clarification ? null : controller.result,
		routeData: routing.data,
		routingPending: Boolean(controller.result && routing.isPending),
		routingError: Boolean(controller.result && routing.isError),
		isStale: controller.isStale,
		hasUnresolved: Boolean(model?.unresolved.length),
		validateConfigurationRevision: props.validateConfigurationRevision,
		onBeforeApply: props.onBeforeApply,
		onApplyResult: props.onApplyResult,
		onUndoResult: props.onUndoResult,
	});
	const handleOpenChange = (open: boolean) => {
		if (!open && controller.status === "pending") controller.cancel();
		props.onOpenChange(open);
	};
	return (
		<Dialog open={props.open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle>Generate from customer request</DialogTitle>
					<DialogDescription>
						Review what the request-generation service understood. Nothing is
						written to this form yet.
					</DialogDescription>
				</DialogHeader>
				<SalesRequestGenerationPanelView
                    clarification={controller.clarification}
                    clarificationHistory={controller.clarificationHistory}
                    onAnswerQuestions={answers => void controller.answerQuestions(answers)}
					sourceText={controller.sourceText}
					status={controller.status}
					result={controller.result}
					failure={controller.failure}
					isStale={controller.isStale}
					canRetry={controller.canRetry}
					setSourceText={controller.setSourceText}
					onGenerate={() => void controller.generate()}
					onCancel={controller.cancel}
					onClear={controller.clear}
					onRetry={() => void controller.retry()}
					model={model}
					canInspectJson={props.canInspectJson}
					routingPending={Boolean(controller.result && routing.isPending)}
					routingError={Boolean(controller.result && routing.isError)}
					applyDisabled={apply.applyDisabled}
					applyDisabledReason={apply.applyDisabledReason}
					applyResult={apply.applyResult}
					applyMessage={apply.applyMessage}
					isApplying={apply.isApplying}
					onApply={() => void apply.apply()}
					undoAvailability={apply.undoAvailability}
					undoResult={apply.undoResult}
					undoMessage={apply.undoMessage}
					isUndoing={apply.isUndoing}
					onUndo={() => void apply.undo()}
					onSubmitFeedback={props.onSubmitFeedback}
					generateDisabled={props.generateDisabled}
				/>
				<DialogFooter>
					<p className="text-left text-xs text-muted-foreground sm:mr-auto">
						Review is read-only until Apply. Undo is available after a
						successful apply while the generated changes remain safe to restore.
					</p>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
