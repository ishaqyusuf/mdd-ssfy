import {
	type SalesFormDeliveryOption,
	type SalesFormEditorState,
	type SalesFormSaveStatus,
	type SalesFormState,
	type SalesFormStateRecord,
	type SetSalesFormDeliveryOptionOptions,
	addSalesFormLineItem,
	clearSalesFormDirty,
	createInitialSalesFormState,
	duplicateSalesFormLineItem,
	hydrateSalesFormState,
	markSalesFormError,
	markSalesFormSaved,
	markSalesFormSaving,
	markSalesFormStale,
	moveSalesFormLineItem,
	patchSalesFormRecord,
	removeSalesFormExtraCost,
	removeSalesFormLineItem,
	restoreSalesFormLocalDraft,
	setSalesFormCustomerProfileMeta,
	setSalesFormDeliveryOption,
	setSalesFormEditorState,
	setSalesFormExtraCosts,
	setSalesFormLineItems,
	setSalesFormMeta,
	setSalesFormSummary,
	setSalesFormTaxRate,
	updateSalesFormLineItem,
	upsertSalesFormExtraCost,
} from "@gnd/sales/sales-form";
import { create } from "zustand";
import {
	type ApplyRequestGenerationProposalResult,
	type PreparedRequestGenerationProposal,
	type RequestGenerationPhase,
	type RequestGenerationState,
	type UndoRequestGenerationProposalResult,
	createInitialRequestGenerationState,
	createRequestGenerationUndoTransaction,
	getRequestGenerationEditorPatch,
	getRequestGenerationRecordRevision,
	getRequestGenerationUndoAvailability,
	removeRequestGenerationProposalSelectively,
} from "./request-generation-transaction";
import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormMeta,
	NewSalesFormRecord,
	NewSalesFormSummary,
} from "./schema";

export type SaveStatus = SalesFormSaveStatus;
export type NewSalesFormEditorState = SalesFormEditorState;
export type NewSalesFormState = Omit<SalesFormState, "record"> & {
	record: NewSalesFormRecord | null;
	requestGeneration: RequestGenerationState;
};

type NewSalesFormActions = {
	reset: () => void;
	hydrate: (record: NewSalesFormRecord) => void;
	restoreLocalDraft: (record: NewSalesFormRecord) => void;
	setMeta: (patch: Partial<NewSalesFormMeta>) => void;
	setDeliveryOption: (
		deliveryOption: SalesFormDeliveryOption,
		options?: SetSalesFormDeliveryOptionOptions,
	) => void;
	setCustomerProfileMeta: (
		patch: Partial<NewSalesFormMeta>,
		previousProfileCoefficient?: number | null,
		nextProfileCoefficient?: number | null,
	) => void;
	setLineItems: (lineItems: NewSalesFormLineItem[]) => void;
	setExtraCosts: (costs: NewSalesFormExtraCost[]) => void;
	upsertExtraCost: (
		cost: Partial<NewSalesFormExtraCost>,
		index?: number,
	) => void;
	removeExtraCost: (index: number) => void;
	addLineItem: (line?: Partial<NewSalesFormLineItem>) => void;
	duplicateLineItem: (uid: string) => void;
	moveLineItem: (uid: string, targetIndex: number) => void;
	updateLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
	removeLineItem: (uid: string) => void;
	setTaxRate: (taxRate: number) => void;
	setSummary: (summary: NewSalesFormSummary) => void;
	patchRecord: (patch: Partial<NewSalesFormRecord>) => void;
	setSpecialOrder: (patch: Partial<NewSalesFormRecord["specialOrder"]>) => void;
	markSaving: () => void;
	markSaved: (payload: {
		version?: string;
		updatedAt?: string | null;
		preserveDirty?: boolean;
	}) => void;
	markError: (message: string) => void;
	markStale: (message?: string) => void;
	clearDirty: () => void;
	setEditor: (patch: Partial<NewSalesFormEditorState>) => void;
	setRequestGenerationPhase: (phase: RequestGenerationPhase) => void;
	applyRequestGenerationProposal: (
		proposal: PreparedRequestGenerationProposal,
	) => ApplyRequestGenerationProposalResult;
	undoRequestGenerationProposal: (
		proposalId: string,
	) => UndoRequestGenerationProposalResult;
};

export type NewSalesFormStore = NewSalesFormState & NewSalesFormActions;

const initialState = {
	...createInitialSalesFormState(),
	requestGeneration: createInitialRequestGenerationState(),
} as NewSalesFormState;

function applySalesFormState(
	reducer: (state: SalesFormState) => SalesFormState,
) {
	return (state: NewSalesFormStore) =>
		reducer(state as unknown as SalesFormState) as NewSalesFormStore;
}

export const useNewSalesFormStore = create<NewSalesFormStore>((set) => ({
	...initialState,
	reset: () =>
		set({
			...createInitialSalesFormState(),
			requestGeneration: createInitialRequestGenerationState(),
		} as NewSalesFormState),
	hydrate: (record) =>
		set((state) => ({
			...applySalesFormState((current) =>
				hydrateSalesFormState(
					current,
					record as unknown as SalesFormStateRecord,
				),
			)(state),
			requestGeneration: createInitialRequestGenerationState(),
		})),
	restoreLocalDraft: (record) =>
		set(
			applySalesFormState((state) =>
				restoreSalesFormLocalDraft(
					state,
					record as unknown as SalesFormStateRecord,
				),
			),
		),
	setMeta: (patch) =>
		set(applySalesFormState((state) => setSalesFormMeta(state, patch))),
	setDeliveryOption: (deliveryOption, options) =>
		set(
			applySalesFormState((state) =>
				setSalesFormDeliveryOption(state, deliveryOption, options),
			),
		),
	setCustomerProfileMeta: (
		patch,
		previousProfileCoefficient,
		nextProfileCoefficient,
	) =>
		set(
			applySalesFormState((state) =>
				setSalesFormCustomerProfileMeta(
					state,
					patch,
					previousProfileCoefficient,
					nextProfileCoefficient,
				),
			),
		),
	setLineItems: (lineItems) =>
		set(
			applySalesFormState((state) => setSalesFormLineItems(state, lineItems)),
		),
	setExtraCosts: (costs) =>
		set(applySalesFormState((state) => setSalesFormExtraCosts(state, costs))),
	upsertExtraCost: (cost, index) =>
		set(
			applySalesFormState((state) =>
				upsertSalesFormExtraCost(state, cost, index),
			),
		),
	removeExtraCost: (index) =>
		set(applySalesFormState((state) => removeSalesFormExtraCost(state, index))),
	addLineItem: (line) =>
		set(applySalesFormState((state) => addSalesFormLineItem(state, line))),
	duplicateLineItem: (uid) =>
		set(applySalesFormState((state) => duplicateSalesFormLineItem(state, uid))),
	moveLineItem: (uid, targetIndex) =>
		set(
			applySalesFormState((state) =>
				moveSalesFormLineItem(state, uid, targetIndex),
			),
		),
	updateLineItem: (uid, patch) =>
		set(
			applySalesFormState((state) =>
				updateSalesFormLineItem(state, uid, patch),
			),
		),
	removeLineItem: (uid) =>
		set(applySalesFormState((state) => removeSalesFormLineItem(state, uid))),
	setTaxRate: (taxRate) =>
		set(applySalesFormState((state) => setSalesFormTaxRate(state, taxRate))),
	setSummary: (summary) =>
		set(applySalesFormState((state) => setSalesFormSummary(state, summary))),
	patchRecord: (patch) =>
		set(applySalesFormState((state) => patchSalesFormRecord(state, patch))),
	setSpecialOrder: (patch) =>
		set((state) => {
			if (!state.record) return state;
			return {
				...state,
				record: {
					...state.record,
					specialOrder: {
						...state.record.specialOrder,
						...patch,
					},
				},
				dirty: true,
				saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
			};
		}),
	markSaving: () =>
		set(applySalesFormState((state) => markSalesFormSaving(state))),
	markSaved: (payload) =>
		set(applySalesFormState((state) => markSalesFormSaved(state, payload))),
	markError: (message) =>
		set(applySalesFormState((state) => markSalesFormError(state, message))),
	markStale: (message) =>
		set(applySalesFormState((state) => markSalesFormStale(state, message))),
	clearDirty: () =>
		set(applySalesFormState((state) => clearSalesFormDirty(state))),
	setEditor: (patch) =>
		set(applySalesFormState((state) => setSalesFormEditorState(state, patch))),
	setRequestGenerationPhase: (phase) =>
		set((state) => ({
			...state,
			requestGeneration: {
				...state.requestGeneration,
				phase,
				autosaveSuspended: phase !== "idle",
			},
		})),
	applyRequestGenerationProposal: (proposal) => {
		let result: ApplyRequestGenerationProposalResult = {
			status: "unavailable",
		};
		set((state) => {
			if (!state.record) return state;
			if (
				state.requestGeneration.appliedProposalIds.includes(proposal.proposalId)
			) {
				result = { status: "already-applied" };
				return state;
			}
			if (
				getRequestGenerationRecordRevision(state.record) !==
				proposal.baseRevision
			) {
				result = { status: "stale" };
				return state;
			}
			const undo = createRequestGenerationUndoTransaction({
				proposal,
				beforeRecord: state.record,
				beforeStore: {
					dirty: state.dirty,
					saveStatus: state.saveStatus,
					lastSaveError: state.lastSaveError,
					lastSavedAt: state.lastSavedAt,
					editor: state.editor,
				},
			});
			result = { status: "applied" };
			return {
				...state,
				record: structuredClone(proposal.record),
				dirty: true,
				saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
				editor: {
					...state.editor,
					...getRequestGenerationEditorPatch(proposal.record),
				},
				requestGeneration: {
					phase: "idle",
					autosaveSuspended: false,
					appliedProposalIds: [
						...state.requestGeneration.appliedProposalIds,
						proposal.proposalId,
					],
					undo,
				},
			};
		});
		return result;
	},
	undoRequestGenerationProposal: (proposalId) => {
		let result: UndoRequestGenerationProposalResult = {
			status: "unavailable",
		};
		set((state) => {
			const undo = state.requestGeneration.undo;
			if (!state.record || !undo || undo.proposalId !== proposalId)
				return state;
			const appliedProposalIds =
				state.requestGeneration.appliedProposalIds.filter(
					(candidate) => candidate !== proposalId,
				);
			if (getRequestGenerationUndoAvailability(state.record, undo) === "full") {
				result = { status: "restored" };
				return {
					...state,
					...undo.beforeStore,
					record: structuredClone(undo.beforeRecord),
					requestGeneration: {
						phase: "idle",
						autosaveSuspended: false,
						appliedProposalIds,
						undo: null,
					},
				};
			}
			const selective = removeRequestGenerationProposalSelectively(
				state.record,
				undo,
			);
			result = {
				status: "selective-removed",
				removedLineUids: selective.removedLineUids,
				retainedLineUids: selective.retainedLineUids,
			};
			return {
				...state,
				record: selective.record,
				dirty: true,
				editor: {
					...state.editor,
					...getRequestGenerationEditorPatch(selective.record),
				},
				requestGeneration: {
					phase: "idle",
					autosaveSuspended: false,
					appliedProposalIds,
					undo: null,
				},
			};
		});
		return result;
	},
}));
