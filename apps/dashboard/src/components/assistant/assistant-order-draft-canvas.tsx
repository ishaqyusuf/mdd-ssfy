"use client";

import { useTRPCClient } from "@/trpc/client";
import type {
	CustomerProfileRecord,
	ResolveNewSalesFormSeedComponents,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { AlertCircle, FilePlus2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	useCustomerProfilesQuery,
	useNewSalesFormBootstrapQuery,
	useNewSalesFormStepRoutingQuery,
	useSalesRequestValidatePreviewMutation,
} from "../forms/new-sales-form/api";
import {
	type FreshStepComponentsClient,
	type SalesRequestGenerationApplyResult,
	applySalesRequestGenerationProposal,
	createFreshStepComponentsResolver,
} from "../forms/new-sales-form/request-generation-apply";
import type { SalesRequestGeneratePreviewOutput } from "../forms/new-sales-form/request-generation-controller";
import { writeSalesRequestGenerationHandoff } from "../forms/new-sales-form/request-generation-handoff";
import { SalesRequestReviewContent } from "../forms/new-sales-form/request-generation-panel";
import { buildSalesRequestReviewModel } from "../forms/new-sales-form/request-generation-presentation";
import type { NewSalesFormRecord } from "../forms/new-sales-form/schema";
import {
	assistantArtifactDialogAttributes,
	syncAssistantArtifactDialogMode,
} from "./assistant-artifact-canvas";
import type { AssistantMessageViewModel } from "./assistant-message-view-model";
import styles from "./assistant.module.css";

export type AssistantOrderDraft =
	AssistantMessageViewModel["orderDrafts"][number];

type AssistantOrderDraftPreparationState = {
	draftId: string;
	result: SalesRequestGenerationApplyResult;
};

export function selectAssistantOrderDraftPreparation(
	draftId: string | null,
	state: AssistantOrderDraftPreparationState | null,
) {
	return draftId && state?.draftId === draftId ? state.result : null;
}

export function createAssistantOrderDraftSalesHandoff(
	draft: AssistantOrderDraft,
	conversationId?: string,
) {
	const preview = {
		...draft.data,
		clarification: null,
		userReviewed: true as const,
	} as SalesRequestGeneratePreviewOutput;
	return {
		preview,
		href: `/sales-form/create-${draft.data.type}?${new URLSearchParams({ salesRequestGeneration: draft.data.generationId, ...(conversationId ? { assistantChat: conversationId } : {}) })}`,
	};
}

export async function prepareAssistantOrderDraftCanvas(input: {
	draft: AssistantOrderDraft;
	baseRecord: NewSalesFormRecord;
	routeData: WorkflowRouteData;
	profileRecords: CustomerProfileRecord[];
	validateConfigurationRevision: () => Promise<string | null | undefined>;
	resolveComponents: ResolveNewSalesFormSeedComponents;
}): Promise<SalesRequestGenerationApplyResult> {
	const currentRevision = String(
		(await input.validateConfigurationRevision()) ?? "",
	).trim();
	if (currentRevision !== input.draft.data.configurationRevision) {
		return {
			status: "configuration-stale",
			expectedRevision: input.draft.data.configurationRevision,
			currentRevision: currentRevision || "unavailable",
		};
	}
	return applySalesRequestGenerationProposal({
		preview: {
			...input.draft.data,
			clarification: null,
		} as SalesRequestGeneratePreviewOutput,
		proposalId: input.draft.data.generationId,
		baseRecord: input.baseRecord,
		routeData: input.routeData,
		profileRecords: input.profileRecords,
		validateConfigurationRevision: input.validateConfigurationRevision,
		resolveComponents: input.resolveComponents,
		applyProposal: () => ({ status: "unavailable" }),
		performApply: false,
	});
}

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

function money(value: unknown) {
	const amount = Number(value);
	return Number.isFinite(amount) ? amount : 0;
}

export function AssistantOrderDraftPricing({
	preparation,
}: {
	preparation: SalesRequestGenerationApplyResult | null;
}) {
	if (preparation?.status !== "ready") return null;
	const record = preparation.proposal.record;
	return (
		<section
			className="rounded-lg border bg-card p-4"
			aria-labelledby="draft-pricing-title"
		>
			<div className="flex items-baseline justify-between gap-3">
				<div>
					<h2 id="draft-pricing-title" className="font-semibold">
						Authoritative pricing
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Calculated by the current native Sales form and customer profile.
					</p>
				</div>
				<strong className="text-lg">
					{formatMoney(money(record.summary.grandTotal))}
				</strong>
			</div>
			<ul className="mt-4 divide-y rounded-md border text-sm">
				{record.lineItems.map((line, index) => (
					<li
						key={String(line.uid || index)}
						className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2"
					>
						<span>
							<strong>{String(line.title || `Line ${index + 1}`)}</strong>
							<small className="block text-muted-foreground">
								{money(line.qty)} × {formatMoney(money(line.unitPrice))}
							</small>
						</span>
						<span className="font-medium">
							{formatMoney(money(line.lineTotal))}
						</span>
					</li>
				))}
				{record.extraCosts.map((cost, index) => (
					<li
						key={`${String(cost.type || "cost")}:${index}`}
						className="flex justify-between gap-3 px-3 py-2"
					>
						<span>{String(cost.label || cost.type || "Adjustment")}</span>
						<span className="font-medium">
							{formatMoney(money(cost.amount))}
						</span>
					</li>
				))}
			</ul>
			<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Subtotal</dt>
				<dd className="text-right font-medium">
					{formatMoney(money(record.summary.subTotal))}
				</dd>
				<dt className="text-muted-foreground">Tax</dt>
				<dd className="text-right font-medium">
					{formatMoney(money(record.summary.taxTotal))}
				</dd>
				<dt className="font-semibold">Grand total</dt>
				<dd className="text-right font-semibold">
					{formatMoney(money(record.summary.grandTotal))}
				</dd>
			</dl>
		</section>
	);
}

export function AssistantOrderDraftProvenance({
	draft,
}: {
	draft: AssistantOrderDraft;
}) {
	return (
		<section
			className="rounded-lg border bg-muted/20 p-4"
			aria-labelledby="draft-evidence-title"
		>
			<h2 id="draft-evidence-title" className="font-semibold">
				Source evidence
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				The selections below were extracted from the chat request and mapped to
				the published Sales catalog.
			</p>
			<dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">Catalog scope</dt>
					<dd className="break-all font-medium">
						{draft.data.configurationScope}
					</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Catalog revision</dt>
					<dd className="break-all font-medium">
						{draft.data.configurationRevision}
					</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Generation</dt>
					<dd className="break-all font-medium">{draft.data.generationId}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Model evidence</dt>
					<dd className="font-medium">
						{draft.data.provider} · {draft.data.model} ·{" "}
						{draft.data.promptVersion}
					</dd>
				</div>
			</dl>
		</section>
	);
}

export function AssistantOrderDraftPreparationStatus({
	preparation,
}: {
	preparation: SalesRequestGenerationApplyResult | null;
}) {
	if (!preparation) {
		return (
			<div
				role="status"
				className="h-16 animate-pulse rounded-lg bg-muted"
				aria-label="Preparing native Sales preview"
			/>
		);
	}
	if (preparation.status === "ready") {
		return (
			<output className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
				<strong>Native Sales preview ready</strong>
				<p className="mt-1 text-sm">
					The existing Sales initializer resolved this request into{" "}
					{preparation.proposal.record.lineItems.length} priced line item
					{preparation.proposal.record.lineItems.length === 1 ? "" : "s"}. Grand
					total: {formatMoney(preparation.proposal.record.summary.grandTotal)}.
				</p>
			</output>
		);
	}
	if (preparation.status === "configuration-stale") {
		return (
			<section
				role="alert"
				className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
			>
				The Sales configuration changed. Generate this draft again before
				applying it.
			</section>
		);
	}
	if (preparation.status === "blocked") {
		return (
			<section
				role="alert"
				className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
			>
				<strong>This draft needs review before it can be prepared.</strong>
				<p className="mt-1">
					{preparation.issues.length} initializer issue
					{preparation.issues.length === 1 ? "" : "s"} must be resolved in the
					Sales form.
				</p>
			</section>
		);
	}
	return (
		<section
			role="alert"
			className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
		>
			The native Sales preview could not be prepared.
		</section>
	);
}

export function AssistantOrderDraftCanvas({
	draft,
	onClose,
	conversationId,
}: {
	draft: AssistantOrderDraft | null;
	onClose: () => void;
	conversationId?: string;
}) {
	const client = useTRPCClient();
	const router = useRouter();
	const canvasRef = useRef<HTMLDialogElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const [compact, setCompact] = useState(false);
	const [handoffError, setHandoffError] = useState<string | null>(null);
	const [handoffPending, setHandoffPending] = useState(false);
	const [preparationState, setPreparationState] =
		useState<AssistantOrderDraftPreparationState | null>(null);
	const type = draft?.data.type ?? "order";
	const bootstrap = useNewSalesFormBootstrapQuery(
		{ type, customerId: null },
		Boolean(draft),
	);
	const routing = useNewSalesFormStepRoutingQuery({}, Boolean(draft));
	const profiles = useCustomerProfilesQuery(Boolean(draft));
	const validatePreview = useSalesRequestValidatePreviewMutation();

	useEffect(() => {
		if (!draft) return;
		if (bootstrap.isError || routing.isError || profiles.isError) {
			setPreparationState({
				draftId: draft.id,
				result: {
					status: "error",
					error: new Error("Native Sales form data is unavailable"),
				},
			});
			return;
		}
		if (!bootstrap.data || !routing.data || profiles.isPending) return;
		let active = true;
		const validateConfigurationRevision = async () => {
			const current = await validatePreview.mutateAsync({
				type: draft.data.type,
				source: "assistant",
				configurationScope: draft.data.configurationScope,
				configurationRevision: draft.data.configurationRevision,
				provider: draft.data.provider,
				model: draft.data.model,
			});
			return current.configurationRevision;
		};
		void prepareAssistantOrderDraftCanvas({
			draft,
			baseRecord: bootstrap.data as NewSalesFormRecord,
			routeData: routing.data as WorkflowRouteData,
			profileRecords: (profiles.data ?? []) as CustomerProfileRecord[],
			validateConfigurationRevision,
			resolveComponents: createFreshStepComponentsResolver(
				client as unknown as FreshStepComponentsClient,
			),
		})
			.then((result) => {
				if (active) setPreparationState({ draftId: draft.id, result });
			})
			.catch((error) => {
				if (active)
					setPreparationState({
						draftId: draft.id,
						result: { status: "error", error },
					});
			});
		return () => {
			active = false;
		};
	}, [
		bootstrap.data,
		bootstrap.isError,
		client,
		draft,
		profiles.data,
		profiles.isPending,
		profiles.isError,
		routing.data,
		routing.isError,
		validatePreview.mutateAsync,
	]);

	useEffect(() => {
		if (!draft) return;
		const previousFocus = globalThis.document
			.activeElement as HTMLElement | null;
		const media = window.matchMedia("(max-width: 700px)");
		const sync = () => {
			const dialog = canvasRef.current;
			if (!dialog) return;
			setCompact(media.matches);
			syncAssistantArtifactDialogMode(dialog, media.matches);
		};
		sync();
		media.addEventListener("change", sync);
		closeButtonRef.current?.focus();
		return () => {
			media.removeEventListener("change", sync);
			if (canvasRef.current?.open) canvasRef.current.close();
			previousFocus?.focus();
		};
	}, [draft]);
	const reviewModel = useMemo(
		() =>
			draft && routing.data
				? buildSalesRequestReviewModel(draft.data.seed, routing.data)
				: null,
		[draft, routing.data],
	);
	if (!draft) return null;
	const preparation = selectAssistantOrderDraftPreparation(
		draft.id,
		preparationState,
	);
	const continueInSales = async () => {
		if (!bootstrap.data || preparation?.status !== "ready") return;
		setHandoffPending(true);
		setHandoffError(null);
		try {
			const current = await validatePreview.mutateAsync({
				type: draft.data.type,
				configurationScope: draft.data.configurationScope,
				configurationRevision: draft.data.configurationRevision,
				provider: draft.data.provider,
				model: draft.data.model,
			});
			if (current.configurationRevision !== draft.data.configurationRevision) {
				setHandoffError("The Sales configuration changed. Create a new draft.");
				return;
			}
			const handoff = createAssistantOrderDraftSalesHandoff(draft);
			if (!conversationId) {
				writeSalesRequestGenerationHandoff(handoff.preview);
				onClose();
				router.push(handoff.href);
			}
		} catch {
			setHandoffError("The current Sales configuration could not be verified.");
		} finally {
			setHandoffPending(false);
		}
	};
	return (
		<dialog
			ref={canvasRef}
			className={styles.artifactCanvas}
			{...assistantArtifactDialogAttributes(compact)}
			aria-labelledby={titleId}
			data-order-draft-id={draft.id}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<header>
				<div>
					<FilePlus2 size={17} />
					<span>
						<small>Native Sales draft</small>
						<strong id={titleId}>Review {draft.data.type}</strong>
					</span>
				</div>
				<Button
					ref={closeButtonRef}
					type="button"
					variant="ghost"
					size="icon"
					onClick={onClose}
					aria-label="Close order draft"
				>
					<X size={17} />
				</Button>
			</header>
			<div className="flex-1 space-y-5 overflow-y-auto p-5">
				<AssistantOrderDraftPreparationStatus preparation={preparation} />
				<AssistantOrderDraftProvenance draft={draft} />
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg border p-3">
						<small className="text-muted-foreground">Line items</small>
						<div className="mt-1 text-xl font-semibold">
							{draft.data.seed.lineItems.length}
						</div>
					</div>
					<div className="rounded-lg border p-3">
						<small className="text-muted-foreground">Needs review</small>
						<div className="mt-1 text-xl font-semibold">
							{draft.data.unresolvedCount}
						</div>
					</div>
				</div>
				{reviewModel ? (
					<SalesRequestReviewContent model={reviewModel} />
				) : routing.isPending ? (
					<div
						role="status"
						className="h-24 animate-pulse rounded-lg bg-muted"
						aria-label="Loading Sales catalog evidence"
					/>
				) : (
					<section
						role="alert"
						className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
					>
						<AlertCircle className="mr-2 inline" size={16} /> Catalog evidence
						could not be loaded.
					</section>
				)}
				<AssistantOrderDraftPricing preparation={preparation} />
				{handoffError ? (
					<p
						role="alert"
						className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
					>
						{handoffError}
					</p>
				) : null}
			</div>
			<footer className="flex items-center justify-end gap-2 border-t p-4">
				{conversationId && draft ? (
					<Button asChild disabled={preparation?.status !== "ready"}>
						<a
							href={
								createAssistantOrderDraftSalesHandoff(draft, conversationId)
									.href
							}
							target="_blank"
							rel="noopener noreferrer"
							aria-disabled={preparation?.status !== "ready"}
							onClick={(event) => {
								if (preparation?.status !== "ready") event.preventDefault();
							}}
						>
							<Pencil className="mr-2" size={16} /> Open draft in new tab
						</a>
					</Button>
				) : (
					<Button
						type="button"
						onClick={() => void continueInSales()}
						disabled={preparation?.status !== "ready" || handoffPending}
					>
						<Pencil className="mr-2" size={16} />{" "}
						{handoffPending ? "Verifying…" : "Continue in Sales"}
					</Button>
				)}
			</footer>
		</dialog>
	);
}
