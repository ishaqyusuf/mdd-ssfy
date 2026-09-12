import {
	type InitializeNewSalesFormSeedInput,
	type NewSalesFormSeed,
	type NewSalesFormSeedInitializationIssue,
	type SalesFormEditorState,
	type SalesFormSaveStatus,
	type SalesFormStateRecord,
	getInitialSalesFormActiveStepByLine,
	hydrateSalesFormRecord,
	initializeNewSalesFormSeed,
} from "@gnd/sales/sales-form";
import type { NewSalesFormRecord } from "./schema";

export type RequestGenerationPhase =
	| "idle"
	| "generating"
	| "reviewing"
	| "applying";

export type RequestGenerationState = {
	phase: RequestGenerationPhase;
	autosaveSuspended: boolean;
	appliedProposalIds: string[];
	undo: RequestGenerationUndoTransaction | null;
};

export type RequestGenerationStoreSnapshot = {
	dirty: boolean;
	saveStatus: SalesFormSaveStatus;
	lastSaveError: string | null;
	lastSavedAt: string | null;
	editor: SalesFormEditorState;
};

export type RequestGenerationSelectiveRemoval = {
	generatedLineUids: string[];
	generatedLines: NewSalesFormRecord["lineItems"];
	replacedBootstrapLine: NewSalesFormRecord["lineItems"][number] | null;
	beforeForm: NewSalesFormRecord["form"];
	appliedForm: NewSalesFormRecord["form"];
	beforeExtraCosts: NewSalesFormRecord["extraCosts"];
	appliedExtraCosts: NewSalesFormRecord["extraCosts"];
};

export type RequestGenerationUndoTransaction = {
	proposalId: string;
	beforeRevision: string;
	afterRevision: string;
	beforeRecord: NewSalesFormRecord;
	beforeStore: RequestGenerationStoreSnapshot;
	selectiveRemoval: RequestGenerationSelectiveRemoval;
};

export type PreparedRequestGenerationProposal = {
	proposalId: string;
	baseRevision: string;
	record: NewSalesFormRecord;
	generatedLineUids: string[];
	replacedBootstrapLineUid: string | null;
	unresolved: NewSalesFormSeed["unresolved"];
};

export type RequestGenerationPreparationIssue =
	| NewSalesFormSeedInitializationIssue
	| {
			lineUid: string;
			stepId: null;
			reason: "duplicate-line-uid";
	  };

export type PrepareRequestGenerationProposalResult =
	| { status: "ready"; proposal: PreparedRequestGenerationProposal }
	| {
			status: "blocked";
			issues: RequestGenerationPreparationIssue[];
			unresolved: NewSalesFormSeed["unresolved"];
	  };

export type ApplyRequestGenerationProposalResult =
	| { status: "applied" }
	| { status: "already-applied" }
	| { status: "stale" }
	| { status: "unavailable" };

export type UndoRequestGenerationProposalResult =
	| { status: "restored" }
	| {
			status: "selective-removed";
			removedLineUids: string[];
			retainedLineUids: string[];
	  }
	| { status: "unavailable" };

type PrepareRequestGenerationProposalInput = Omit<
	InitializeNewSalesFormSeedInput<NewSalesFormRecord>,
	"seed" | "baseRecord"
> & {
	proposalId: string;
	seed: NewSalesFormSeed;
	baseRecord: NewSalesFormRecord;
};

function clone<T>(value: T): T {
	return structuredClone(value);
}

function comparable(value: unknown) {
	return JSON.stringify(value);
}

export function getRequestGenerationRecordRevision(record: NewSalesFormRecord) {
	return comparable(record);
}

export function createInitialRequestGenerationState(): RequestGenerationState {
	return {
		phase: "idle",
		autosaveSuspended: false,
		appliedProposalIds: [],
		undo: null,
	};
}

export function isUntouchedBootstrapLine(
	line: NewSalesFormRecord["lineItems"][number],
) {
	return (
		line.id == null &&
		String(line.title || "") === "" &&
		String(line.description || "") === "" &&
		Number(line.qty) === 1 &&
		Number(line.unitPrice) === 0 &&
		Number(line.lineTotal) === 0 &&
		Object.keys(line.meta || {}).length === 0 &&
		(line.formSteps || []).length === 0 &&
		(line.shelfItems || []).length === 0 &&
		line.housePackageTool == null
	);
}

export async function prepareRequestGenerationProposal(
	input: PrepareRequestGenerationProposalInput,
): Promise<PrepareRequestGenerationProposalResult> {
	const proposalId = input.proposalId.trim();
	if (!proposalId)
		throw new Error("A request-generation proposal ID is required");
	const baseRecord = clone(input.baseRecord);
	const { proposalId: _proposalId, ...initializerInput } = input;
	const initialized = await initializeNewSalesFormSeed({
		...initializerInput,
		seed: clone(input.seed),
		baseRecord,
	});
	if (initialized.issues.length > 0) {
		return {
			status: "blocked",
			issues: clone(initialized.issues),
			unresolved: clone(initialized.unresolved),
		};
	}

	const generatedLines = clone(initialized.record.lineItems);
	const bootstrapLine =
		baseRecord.lineItems.length === 1 &&
		baseRecord.lineItems[0] &&
		isUntouchedBootstrapLine(baseRecord.lineItems[0])
			? baseRecord.lineItems[0]
			: null;
	const existingUids = new Set(
		bootstrapLine ? [] : baseRecord.lineItems.map((line) => line.uid),
	);
	const duplicateUid = generatedLines.find((line) =>
		existingUids.has(line.uid),
	);
	if (duplicateUid) {
		return {
			status: "blocked",
			issues: [
				{
					lineUid: duplicateUid.uid,
					stepId: null,
					reason: "duplicate-line-uid",
				},
			],
			unresolved: clone(initialized.unresolved),
		};
	}
	const lineItems = bootstrapLine
		? generatedLines
		: [...clone(baseRecord.lineItems), ...generatedLines];
	const record = hydrateSalesFormRecord({
		...initialized.record,
		lineItems,
	}) as NewSalesFormRecord;

	return {
		status: "ready",
		proposal: {
			proposalId,
			baseRevision: getRequestGenerationRecordRevision(input.baseRecord),
			record: clone(record),
			generatedLineUids: generatedLines.map((line) => line.uid),
			replacedBootstrapLineUid: bootstrapLine?.uid || null,
			unresolved: clone(initialized.unresolved),
		},
	};
}

export function createRequestGenerationUndoTransaction(input: {
	proposal: PreparedRequestGenerationProposal;
	beforeRecord: NewSalesFormRecord;
	beforeStore: RequestGenerationStoreSnapshot;
}): RequestGenerationUndoTransaction {
	const generatedUidSet = new Set(input.proposal.generatedLineUids);
	return {
		proposalId: input.proposal.proposalId,
		beforeRevision: input.proposal.baseRevision,
		afterRevision: getRequestGenerationRecordRevision(input.proposal.record),
		beforeRecord: clone(input.beforeRecord),
		beforeStore: clone(input.beforeStore),
		selectiveRemoval: {
			generatedLineUids: [...input.proposal.generatedLineUids],
			generatedLines: clone(
				input.proposal.record.lineItems.filter((line) =>
					generatedUidSet.has(line.uid),
				),
			),
			replacedBootstrapLine:
				input.proposal.replacedBootstrapLineUid == null
					? null
					: clone(input.beforeRecord.lineItems[0] || null),
			beforeForm: clone(input.beforeRecord.form),
			appliedForm: clone(input.proposal.record.form),
			beforeExtraCosts: clone(input.beforeRecord.extraCosts),
			appliedExtraCosts: clone(input.proposal.record.extraCosts),
		},
	};
}

export function getRequestGenerationUndoAvailability(
	record: NewSalesFormRecord | null,
	transaction: RequestGenerationUndoTransaction | null,
): "none" | "full" | "selective" {
	if (!record || !transaction) return "none";
	return getRequestGenerationRecordRevision(record) ===
		transaction.afterRevision
		? "full"
		: "selective";
}

function selectivelyRestoreForm(
	current: NewSalesFormRecord["form"],
	transaction: RequestGenerationSelectiveRemoval,
) {
	const next = { ...current } as Record<string, unknown>;
	const before = transaction.beforeForm as Record<string, unknown>;
	const applied = transaction.appliedForm as Record<string, unknown>;
	for (const key of new Set([
		...Object.keys(before),
		...Object.keys(applied),
	])) {
		if (comparable(next[key]) !== comparable(applied[key])) continue;
		if (Object.prototype.hasOwnProperty.call(before, key))
			next[key] = before[key];
		else delete next[key];
	}
	return next as NewSalesFormRecord["form"];
}

export function removeRequestGenerationProposalSelectively(
	record: NewSalesFormRecord,
	transaction: RequestGenerationUndoTransaction,
) {
	const generatedByUid = new Map(
		transaction.selectiveRemoval.generatedLines.map((line) => [line.uid, line]),
	);
	const removedLineUids: string[] = [];
	const retainedLineUids: string[] = [];
	const lineItems = record.lineItems.filter((line) => {
		const generated = generatedByUid.get(line.uid);
		if (!generated) return true;
		if (comparable(line) !== comparable(generated)) {
			retainedLineUids.push(line.uid);
			return true;
		}
		removedLineUids.push(line.uid);
		return false;
	});
	if (
		lineItems.length === 0 &&
		transaction.selectiveRemoval.replacedBootstrapLine
	) {
		lineItems.push(clone(transaction.selectiveRemoval.replacedBootstrapLine));
	}
	const extraCosts =
		comparable(record.extraCosts) ===
		comparable(transaction.selectiveRemoval.appliedExtraCosts)
			? clone(transaction.selectiveRemoval.beforeExtraCosts)
			: record.extraCosts;
	const nextRecord = hydrateSalesFormRecord({
		...record,
		form: selectivelyRestoreForm(record.form, transaction.selectiveRemoval),
		lineItems,
		extraCosts,
	}) as NewSalesFormRecord;
	return { record: nextRecord, removedLineUids, retainedLineUids };
}

export function getRequestGenerationEditorPatch(record: NewSalesFormRecord) {
	return {
		activeItem: record.lineItems[0]?.uid || null,
		activeStepByLine: getInitialSalesFormActiveStepByLine(
			record as unknown as SalesFormStateRecord,
		),
	};
}
