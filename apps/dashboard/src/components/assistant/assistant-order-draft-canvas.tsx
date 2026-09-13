"use client";

import { useTRPCClient } from "@/trpc/client";
import type {
	CustomerProfileRecord,
	ResolveNewSalesFormSeedComponents,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { AlertCircle, FilePlus2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
		preview: input.draft.data,
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
}: { draft: AssistantOrderDraft | null; onClose: () => void }) {
	const client = useTRPCClient();
	const canvasRef = useRef<HTMLDialogElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const [compact, setCompact] = useState(false);
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
	if (!draft) return null;
	const preparation = selectAssistantOrderDraftPreparation(
		draft.id,
		preparationState,
	);
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
				{draft.data.seed.lineItems.map((line, index) => (
					<section className="rounded-lg border p-4" key={line.uid}>
						<div className="flex items-center justify-between gap-3">
							<strong>Line {index + 1}</strong>
							<span className="text-sm text-muted-foreground">
								Quantity {line.qty}
							</span>
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{line.formSteps.length} configured selection
							{line.formSteps.length === 1 ? "" : "s"}
						</p>
					</section>
				))}
				{draft.data.seed.unresolved.length ? (
					<section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
						<div className="flex items-center gap-2 font-medium">
							<AlertCircle size={16} /> Details needed before this can be
							applied
						</div>
						<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
							{draft.data.seed.unresolved.map((item, index) => (
								<li key={`${item.lineUid ?? "draft"}:${item.field}:${index}`}>
									{item.reason}
								</li>
							))}
						</ul>
					</section>
				) : null}
				<p className="text-xs text-muted-foreground">
					Catalog revision {draft.data.configurationRevision}
				</p>
			</div>
		</dialog>
	);
}
