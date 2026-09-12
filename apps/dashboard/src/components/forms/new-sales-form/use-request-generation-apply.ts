"use client";

import { useTRPCClient } from "@/trpc/client";
import type {
	CustomerProfileRecord,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useCustomerProfilesQuery,
	useSalesRequestValidatePreviewMutation,
} from "./api";
import {
	type FreshStepComponentsClient,
	type SalesRequestGenerationApplyResult,
	type SalesRequestGenerationConfigurationValidator,
	applySalesRequestGenerationProposal,
	createFreshStepComponentsResolver,
	getSalesRequestGenerationProposalId,
} from "./request-generation-apply";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import {
	type UndoRequestGenerationProposalResult,
	getRequestGenerationRecordRevision,
	getRequestGenerationUndoAvailability,
} from "./request-generation-transaction";
import type { NewSalesFormStepRouting } from "./schema";
import { useNewSalesFormStore } from "./store";

export type UseSalesRequestGenerationApplyOptions = {
	open: boolean;
	preview: SalesRequestGeneratePreviewOutput | null;
	routeData: NewSalesFormStepRouting | null | undefined;
	routingPending?: boolean;
	routingError?: boolean;
	isStale?: boolean;
	hasUnresolved?: boolean;
	validateConfigurationRevision?: SalesRequestGenerationConfigurationValidator;
	onBeforeApply?: () => void;
};

export type SalesRequestGenerationApplyDisabledReason =
	| "missing-preview"
	| "missing-record"
	| "missing-proposal"
	| "routing-pending"
	| "routing-error"
	| "route-unavailable"
	| "stale-preview"
	| "blocking-review"
	| "profile-loading"
	| "profile-error"
	| "persisted-record"
	| "configuration-validator-required"
	| "applying";

function asWorkflowRouteData(
	value: NewSalesFormStepRouting | null | undefined,
): WorkflowRouteData | null | undefined {
	return value as WorkflowRouteData | null | undefined;
}

function asFreshStepComponentsClient(value: unknown) {
	return value as FreshStepComponentsClient;
}

export function getSalesRequestGenerationApplyMessage(
	result: SalesRequestGenerationApplyResult | null,
) {
	if (!result) return null;
	if (result.status === "applied") return "Applied to the form.";
	if (result.status === "already-applied") {
		return "This proposal was already applied to the form.";
	}
	if (result.status === "configuration-stale") {
		return "The sales configuration changed. Generate a new preview before applying.";
	}
	if (result.status === "error") {
		return "The proposal could not be applied. Review the request and try again.";
	}
	switch (result.reason) {
		case "unresolved":
			return "Resolve every blocking request item before applying.";
		case "initializer-issue":
			return "The proposal does not fit the current form workflow.";
		case "profile-unavailable":
			return "The selected customer profile could not be resolved.";
		case "profile-invalid":
			return "The selected customer profile has an invalid pricing coefficient.";
		case "form-stale":
			return "The form changed while this proposal was being prepared. Generate it again.";
		case "configuration-validator-required":
			return "Apply is unavailable until the current sales configuration is verified.";
		case "route-unavailable":
			return "The current sales workflow could not be loaded.";
		case "configuration-unavailable":
			return "The preview has no valid sales configuration revision.";
		case "persisted-record":
			return "Request generation can only be applied while creating a new sale.";
		case "apply-unavailable":
			return "The proposal is no longer available to apply.";
		case "missing-preview":
			return "Generate a preview before applying.";
		default:
			return "The proposal could not be applied.";
	}
}

export function getSalesRequestGenerationUndoMessage(
	result: UndoRequestGenerationProposalResult | null,
) {
	if (!result) return null;
	if (result.status === "restored") {
		return "All generated changes were undone.";
	}
	if (result.status === "selective-removed") {
		return result.removedLineUids.length
			? `Generated changes were removed; ${result.retainedLineUids.length} edited line${result.retainedLineUids.length === 1 ? "" : "s"} was retained.`
			: "No generated changes were available to undo.";
	}
	return "These generated changes can no longer be undone safely.";
}

export function useSalesRequestGenerationApply(
	options: UseSalesRequestGenerationApplyOptions,
) {
	const client = useTRPCClient();
	const validatePreviewMutation = useSalesRequestValidatePreviewMutation();
	const record = useNewSalesFormStore((state) => state.record);
	const requestGeneration = useNewSalesFormStore(
		(state) => state.requestGeneration,
	);
	const setRequestGenerationPhase = useNewSalesFormStore(
		(state) => state.setRequestGenerationPhase,
	);
	const applyProposal = useNewSalesFormStore(
		(state) => state.applyRequestGenerationProposal,
	);
	const undoProposal = useNewSalesFormStore(
		(state) => state.undoRequestGenerationProposal,
	);
	const selectedProfileId = Number(record?.form?.customerProfileId || 0);
	const profileQuery = useCustomerProfilesQuery(
		options.open && Boolean(options.preview) && selectedProfileId > 0,
	);
	const profileRecords = useMemo(
		() => (profileQuery.data || []) as CustomerProfileRecord[],
		[profileQuery.data],
	);
	const apiConfigurationValidator = useCallback(async () => {
		const preview = options.preview;
		if (!preview) return null;
		const current = await validatePreviewMutation.mutateAsync({
			configurationScope: preview.configurationScope,
			configurationRevision: preview.configurationRevision,
			provider: preview.provider,
			model: preview.model,
		});
		return current.configurationRevision;
	}, [options.preview, validatePreviewMutation.mutateAsync]);
	const validateConfigurationRevision =
		options.validateConfigurationRevision || apiConfigurationValidator;
	const proposalId = getSalesRequestGenerationProposalId(options.preview);
	const undoAvailability = useMemo(() => {
		if (!proposalId || requestGeneration.undo?.proposalId !== proposalId) {
			return "none" as const;
		}
		return getRequestGenerationUndoAvailability(record, requestGeneration.undo);
	}, [proposalId, record, requestGeneration.undo]);
	const [applyResult, setApplyResult] =
		useState<SalesRequestGenerationApplyResult | null>(null);
	const [undoResult, setUndoResult] =
		useState<UndoRequestGenerationProposalResult | null>(null);
	const [isApplying, setIsApplying] = useState(false);
	const [isUndoing, setIsUndoing] = useState(false);
	const applyingRef = useRef(false);
	const undoingRef = useRef(false);

	// The generation ID intentionally resets local apply/undo status for each preview.
	// biome-ignore lint/correctness/useExhaustiveDependencies: generation ID is the preview identity boundary.
	useEffect(() => {
		setApplyResult(null);
		setUndoResult(null);
	}, [options.preview?.generationId]);

	const applyDisabledReason =
		useMemo<SalesRequestGenerationApplyDisabledReason | null>(() => {
			if (!options.preview) return "missing-preview";
			if (!record) return "missing-record";
			if (proposalId == null) return "missing-proposal";
			if (options.routingPending) return "routing-pending";
			if (options.routingError) return "routing-error";
			if (!options.routeData) return "route-unavailable";
			if (options.isStale) return "stale-preview";
			if (options.hasUnresolved) return "blocking-review";
			if (selectedProfileId > 0 && profileQuery.isPending) {
				return "profile-loading";
			}
			if (selectedProfileId > 0 && profileQuery.isError) return "profile-error";
			if (record.salesId != null) return "persisted-record";
			if (isApplying) return "applying";
			return null;
		}, [
			isApplying,
			options.hasUnresolved,
			options.isStale,
			options.preview,
			options.routeData,
			options.routingError,
			options.routingPending,
			profileQuery.isError,
			profileQuery.isPending,
			proposalId,
			record,
			selectedProfileId,
		]);

	const apply = useCallback(async () => {
		if (
			applyingRef.current ||
			applyDisabledReason ||
			!record ||
			!options.preview
		) {
			return applyResult;
		}
		const activeProposalId = proposalId;
		if (!activeProposalId) return applyResult;
		applyingRef.current = true;
		setIsApplying(true);
		setUndoResult(null);
		options.onBeforeApply?.();
		setRequestGenerationPhase("applying");
		try {
			const result = await applySalesRequestGenerationProposal({
				preview: options.preview,
				proposalId: activeProposalId,
				baseRecord: record,
				routeData: asWorkflowRouteData(options.routeData),
				profileRecords,
				validateConfigurationRevision,
				resolveComponents: createFreshStepComponentsResolver(
					asFreshStepComponentsClient(client),
				),
				applyProposal,
			});
			setApplyResult(result);
			setRequestGenerationPhase(
				result.status === "applied" || result.status === "already-applied"
					? "idle"
					: "reviewing",
			);
			return result;
		} catch (error) {
			const result: SalesRequestGenerationApplyResult = {
				status: "error",
				error,
			};
			setApplyResult(result);
			setRequestGenerationPhase("reviewing");
			return result;
		} finally {
			applyingRef.current = false;
			setIsApplying(false);
		}
	}, [
		applyDisabledReason,
		applyProposal,
		applyResult,
		client,
		options,
		profileRecords,
		proposalId,
		record,
		setRequestGenerationPhase,
		validateConfigurationRevision,
	]);

	const undo = useCallback(() => {
		if (undoingRef.current || undoAvailability === "none") return undoResult;
		const activeUndo = requestGeneration.undo;
		if (!activeUndo) return undoResult;
		undoingRef.current = true;
		setIsUndoing(true);
		options.onBeforeApply?.();
		setRequestGenerationPhase("applying");
		try {
			const result = undoProposal(activeUndo.proposalId);
			setUndoResult(result);
			setRequestGenerationPhase("idle");
			return result;
		} finally {
			undoingRef.current = false;
			setIsUndoing(false);
		}
	}, [
		options,
		requestGeneration.undo,
		setRequestGenerationPhase,
		undoAvailability,
		undoProposal,
		undoResult,
	]);

	return {
		apply,
		applyResult,
		applyMessage: getSalesRequestGenerationApplyMessage(applyResult),
		applyDisabled: applyDisabledReason != null,
		applyDisabledReason,
		isApplying,
		undo,
		undoAvailability,
		undoResult,
		undoMessage: getSalesRequestGenerationUndoMessage(undoResult),
		isUndoing,
		currentFormRevision: record
			? getRequestGenerationRecordRevision(record)
			: null,
	};
}
