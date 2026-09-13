import { beforeEach, describe, expect, it } from "bun:test";
import {
	type NewSalesFormSeed,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
} from "@gnd/sales/sales-form";
import { toSaveDraftInput } from "./mappers";
import {
	getFreshRequestGenerationLowTouchClaim,
	getRequestGenerationUndoAvailability,
	prepareRequestGenerationProposal,
} from "./request-generation-transaction";
import type { NewSalesFormRecord } from "./schema";
import { useNewSalesFormStore } from "./store";

const doorRouteData: WorkflowRouteData = {
	rootStepUid: "item-type",
	composedRouter: {
		interior: {
			routeSequence: [{ uid: "frame" }, { uid: "door" }],
			config: { noHandle: false, hasSwing: true },
		},
	},
	stepsById: { 1: "item-type", 2: "frame", 3: "door" },
	stepsByUid: {
		"item-type": { id: 1, uid: "item-type", title: "Item Type" },
		frame: { id: 2, uid: "frame", title: "Frame" },
		door: { id: 3, uid: "door", title: "Door" },
	},
};

const doorComponents: Record<number, WorkflowComponentRecord[]> = {
	1: [{ id: 10, uid: "interior", title: "Interior Door", basePrice: 0 }],
	2: [{ id: 20, uid: "primed", title: "Primed Frame", basePrice: 20 }],
	3: [
		{
			id: 30,
			uid: "panel",
			title: "Panel Door",
			basePrice: 100,
			pricing: { "3-0 x 6-8": { basePrice: 150 } },
		},
	],
};

const doorSeed: NewSalesFormSeed = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "generated-door",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "interior" },
				{ stepId: 2, prodUid: "primed" },
				{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
			],
			housePackageTool: {
				doors: [
					{
						dimension: "3-0 x 6-8",
						swing: "inswing",
						lhQty: 1,
						rhQty: 0,
					},
				],
			},
		},
	],
	unresolved: [],
};

const mouldingRouteData: WorkflowRouteData = {
	rootStepUid: "item-type",
	composedRouter: {
		mouldings: {
			routeSequence: [{ uid: "moulding" }, { uid: "line-item" }],
			config: {},
		},
	},
	stepsById: { 1: "item-type", 215: "moulding", 217: "line-item" },
	stepsByUid: {
		"item-type": { id: 1, uid: "item-type", title: "Item Type" },
		moulding: { id: 215, uid: "moulding", title: "Moulding" },
		"line-item": { id: 217, uid: "line-item", title: "Line Item" },
	},
};

const mouldingComponents: Record<number, WorkflowComponentRecord[]> = {
	1: [{ id: 12, uid: "mouldings", title: "Mouldings", basePrice: 0 }],
	215: [
		{
			id: 2151,
			uid: "baseboard-16",
			title: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
			basePrice: 10,
		},
		{
			id: 2152,
			uid: "casing-17",
			title: "CASING 11/16 X 2-1/4 X 17",
			basePrice: 15,
		},
	],
	217: [],
};

const mouldingSeed: NewSalesFormSeed = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "generated-moulding",
			qty: 31,
			formSteps: [
				{ stepId: 1, prodUid: "mouldings" },
				{
					stepId: 215,
					meta: { selectedProdUids: ["baseboard-16", "casing-17"] },
				},
			],
			meta: {
				mouldingRows: [
					{
						uid: "baseboard-16",
						calculation: {
							linearFeet: 400,
							pieceLength: 16,
							wastePercentage: 10,
						},
					},
					{ uid: "casing-17", qty: 3 },
				],
			},
		},
	],
	unresolved: [],
};

function createRecord(lineItems = [createEmptySalesFormLineItem(0)]) {
	return hydrateSalesFormRecord({
		type: "quote",
		salesId: null,
		slug: null,
		version: "new-session-1",
		updatedAt: "2026-09-12T12:00:00.000Z",
		form: { customerProfileId: 7, paymentMethod: null },
		lineItems,
		extraCosts: [],
		summary: { taxRate: 0 },
	}) as NewSalesFormRecord;
}

describe("sales request generation transaction", () => {
	beforeEach(() => {
		useNewSalesFormStore.getState().reset();
	});

	it("replaces only the untouched bootstrap line and applies Door/HPT once atomically", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		useNewSalesFormStore.getState().setRequestGenerationPhase("reviewing");
		expect(
			useNewSalesFormStore.getState().requestGeneration.autosaveSuspended,
		).toBe(true);

		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-door-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		expect(prepared.status).toBe("ready");
		if (prepared.status !== "ready") return;
		expect(baseRecord.lineItems.length).toBe(1);
		expect(prepared.proposal.record.lineItems.length).toBe(1);
		const generatedDoor = prepared.proposal.record.lineItems[0];
		expect(generatedDoor?.uid).toBe("generated-door");
		expect(generatedDoor?.lineTotal).toBe(340);
		expect(generatedDoor?.housePackageTool?.doors?.[0]?.unitPrice).toBe(340);
		expect(generatedDoor?.housePackageTool?.doors?.[0]?.lineTotal).toBe(340);
		expect(prepared.proposal.replacedBootstrapLineUid).toBe(
			baseRecord.lineItems[0]?.uid,
		);

		let notifications = 0;
		const unsubscribe = useNewSalesFormStore.subscribe(() => {
			notifications += 1;
		});
		const applied = useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		expect(applied).toEqual({ status: "applied" });
		expect(notifications).toBe(1);
		const appliedState = useNewSalesFormStore.getState();
		expect(appliedState.dirty).toBe(true);
		expect(appliedState.requestGeneration.phase).toBe("idle");
		expect(appliedState.requestGeneration.autosaveSuspended).toBe(false);
		expect(appliedState.requestGeneration.manualSaveRequired).toBe(true);
		expect(appliedState.requestGeneration.appliedProposalIds).toEqual([
			"proposal-door-1",
		]);

		const duplicate = useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		expect(duplicate).toEqual({ status: "already-applied" });
		expect(notifications).toBe(1);

		const undo = useNewSalesFormStore
			.getState()
			.undoRequestGenerationProposal("proposal-door-1");
		expect(undo).toEqual({ status: "restored" });
		expect(useNewSalesFormStore.getState().record?.lineItems).toEqual(
			baseRecord.lineItems,
		);
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(false);
		unsubscribe();
	});

	it("clears the generated-draft hold only after the native save succeeds", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-manual-save-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");

		useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(true);

		useNewSalesFormStore.getState().markError("Save failed");
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(true);

		useNewSalesFormStore.getState().markSaved({
			version: "saved-version-1",
			updatedAt: "2026-09-13T12:00:00.000Z",
		});
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(false);
	});

	it("restores the explicit-save hold after local crash recovery", () => {
		const recovered = createRecord();
		useNewSalesFormStore.getState().hydrate(createRecord());

		useNewSalesFormStore.getState().restoreLocalDraft(recovered, {
			manualSaveRequired: true,
		});

		expect(useNewSalesFormStore.getState().record).toEqual(recovered);
		expect(useNewSalesFormStore.getState().dirty).toBe(true);
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(true);
	});

	it("preserves the explicit-save hold when a local draft transform omits options", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-preserve-hold-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");

		useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		const transformed = structuredClone(
			useNewSalesFormStore.getState().record as NewSalesFormRecord,
		);
		useNewSalesFormStore.getState().restoreLocalDraft(transformed);

		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(true);
	});

	it("keeps invalid component identities isolated from the store", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		useNewSalesFormStore.getState().setRequestGenerationPhase("reviewing");

		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-invalid-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				Number(step.id) === 3 ? [] : doorComponents[Number(step.id)] || [],
		});
		expect(prepared.status).toBe("blocked");
		if (prepared.status !== "blocked") return;
		expect(
			prepared.issues.some(
				(issue) =>
					issue.lineUid === "generated-door" &&
					issue.reason === "component-missing",
			),
		).toBe(true);
		expect(useNewSalesFormStore.getState().record).toEqual(baseRecord);
		expect(
			useNewSalesFormStore.getState().requestGeneration.autosaveSuspended,
		).toBe(true);
	});

	it("appends native Mouldings and selectively removes them after a later edit", async () => {
		const manualLine = {
			...createEmptySalesFormLineItem(0),
			uid: "manual-line",
			title: "Existing configured line",
			qty: 2,
			unitPrice: 25,
			lineTotal: 50,
		};
		const baseRecord = createRecord([manualLine]);
		useNewSalesFormStore.getState().hydrate(baseRecord);

		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-moulding-1",
			configurationRevision: "config-1",
			seed: mouldingSeed,
			baseRecord,
			routeData: mouldingRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				mouldingComponents[Number(step.id)] || [],
		});
		expect(prepared.status).toBe("ready");
		if (prepared.status !== "ready") return;
		expect(prepared.proposal.replacedBootstrapLineUid).toBe(null);
		expect(prepared.proposal.record.lineItems.length).toBe(2);
		const generatedMoulding = prepared.proposal.record.lineItems[1];
		expect(generatedMoulding?.uid).toBe("generated-moulding");
		expect(generatedMoulding?.title).toBe("Mouldings");
		expect(generatedMoulding?.qty).toBe(31);
		expect(generatedMoulding?.unitPrice).toBe(20.97);
		expect(generatedMoulding?.lineTotal).toBe(650);

		expect(
			useNewSalesFormStore
				.getState()
				.applyRequestGenerationProposal(prepared.proposal, "config-1"),
		).toEqual({ status: "applied" });
		const transaction = useNewSalesFormStore.getState().requestGeneration.undo;
		expect(transaction?.proposalId).toBe("proposal-moulding-1");
		expect(transaction?.beforeRevision).toBe(prepared.proposal.baseRevision);
		expect(transaction?.selectiveRemoval.generatedLineUids).toEqual([
			"generated-moulding",
		]);
		expect(
			getRequestGenerationUndoAvailability(
				useNewSalesFormStore.getState().record,
				transaction,
			),
		).toBe("full");

		useNewSalesFormStore.getState().updateLineItem("manual-line", { qty: 3 });
		expect(
			getRequestGenerationUndoAvailability(
				useNewSalesFormStore.getState().record,
				useNewSalesFormStore.getState().requestGeneration.undo,
			),
		).toBe("selective");

		const undo = useNewSalesFormStore
			.getState()
			.undoRequestGenerationProposal("proposal-moulding-1");
		expect(undo).toEqual({
			status: "selective-removed",
			removedLineUids: ["generated-moulding"],
			retainedLineUids: [],
		});
		const remainingLines =
			useNewSalesFormStore.getState().record?.lineItems || [];
		expect(remainingLines.length).toBe(1);
		expect(remainingLines[0]?.uid).toBe("manual-line");
		expect(remainingLines[0]?.qty).toBe(3);
		expect(remainingLines[0]?.lineTotal).toBe(75);
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(false);
	});

	it("rejects a prepared proposal when the form revision changes before apply", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-stale-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");

		useNewSalesFormStore.getState().setMeta({ notes: "Manual edit" });
		expect(
			useNewSalesFormStore
				.getState()
				.applyRequestGenerationProposal(prepared.proposal, "config-1"),
		).toEqual({ status: "stale" });
		expect(
			useNewSalesFormStore
				.getState()
				.record?.lineItems.some((line) => line.uid === "generated-door"),
		).toBe(false);
	});

	it("rejects a proposal when the current configuration revision changed", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-config-stale-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");

		expect(
			useNewSalesFormStore
				.getState()
				.applyRequestGenerationProposal(prepared.proposal, "config-2"),
		).toEqual({ status: "configuration-stale" });
		expect(useNewSalesFormStore.getState().record).toEqual(baseRecord);
	});

	it("blocks unresolved seed facts before they can enter native store or save state", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const unresolvedSeed = structuredClone(doorSeed);
		unresolvedSeed.unresolved.push({
			lineUid: "generated-door",
			stepId: null,
			field: "Door",
			status: "ambiguous",
			reason: "Two possible configured doors match.",
		});
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-unresolved-1",
			configurationRevision: "config-1",
			seed: unresolvedSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});

		expect(prepared.status).toBe("blocked");
		if (prepared.status !== "blocked") return;
		expect(
			prepared.issues.some((issue) => issue.reason === "unresolved-facts"),
		).toBe(true);
		expect(useNewSalesFormStore.getState().record).toEqual(baseRecord);
		expect(JSON.stringify(toSaveDraftInput(baseRecord, true))).not.toContain(
			"Two possible configured doors match.",
		);

		const ready = await prepareRequestGenerationProposal({
			proposalId: "proposal-forged-unresolved-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (ready.status !== "ready") throw new Error("Expected ready proposal");
		const forged = structuredClone(ready.proposal);
		const forgedUnresolved = unresolvedSeed.unresolved[0];
		if (!forgedUnresolved) throw new Error("Expected unresolved fact");
		forged.unresolved.push(forgedUnresolved);
		expect(
			useNewSalesFormStore
				.getState()
				.applyRequestGenerationProposal(forged, "config-1"),
		).toEqual({ status: "unresolved" });
		expect(useNewSalesFormStore.getState().record).toEqual(baseRecord);
	});

	it("selectively removes canonically saved generated rows without losing current identity or user edits", async () => {
		const manualLine = {
			...createEmptySalesFormLineItem(0),
			id: 41,
			uid: "manual-line",
			title: "Existing configured line",
			qty: 2,
			unitPrice: 25,
			lineTotal: 50,
		};
		const baseRecord = createRecord([manualLine]);
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-canonical-save-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");
		expect(
			useNewSalesFormStore
				.getState()
				.applyRequestGenerationProposal(prepared.proposal, "config-1"),
		).toEqual({ status: "applied" });

		const applied = useNewSalesFormStore.getState().record;
		if (!applied) throw new Error("Expected applied record");
		const savedLines = applied.lineItems.map((line) =>
			line.uid === "generated-door"
				? {
						...line,
						id: 51,
						formSteps: line.formSteps.map((step, index) => ({
							...step,
							id: 61 + index,
						})),
						housePackageTool: line.housePackageTool
							? {
									...line.housePackageTool,
									id: 71,
									doors: line.housePackageTool.doors.map((door) => ({
										...door,
										id: 81,
									})),
								}
							: null,
					}
				: line.uid === "manual-line"
					? { ...line, qty: 3, lineTotal: 75 }
					: line,
		);
		useNewSalesFormStore.getState().patchRecord({
			version: "saved-version-2",
			updatedAt: "2026-09-12T12:05:00.000Z",
			lineItems: savedLines,
			extraCosts: applied.extraCosts.map((cost, index) => ({
				...cost,
				id: 91 + index,
			})),
		});

		expect(
			useNewSalesFormStore
				.getState()
				.undoRequestGenerationProposal("proposal-canonical-save-1"),
		).toEqual({
			status: "selective-removed",
			removedLineUids: ["generated-door"],
			retainedLineUids: [],
		});
		const restored = useNewSalesFormStore.getState().record;
		expect(restored?.version).toBe("saved-version-2");
		expect(restored?.lineItems.length).toBe(1);
		expect(restored?.lineItems[0]?.id).toBe(41);
		expect(restored?.lineItems[0]?.qty).toBe(3);
		expect(restored?.lineItems[0]?.lineTotal).toBe(75);
		expect(restored?.extraCosts[0]?.id).toBe(91);
	});

	it("retains a canonically saved generated row when a commercial field changed", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-saved-commercial-edit-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");
		useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		const applied = useNewSalesFormStore.getState().record;
		if (!applied) throw new Error("Expected applied record");
		useNewSalesFormStore.getState().patchRecord({
			version: "saved-version-commercial-edit",
			lineItems: applied.lineItems.map((line) => ({
				...line,
				id: 151,
				description: "User-authored commercial note",
			})),
		});

		expect(
			useNewSalesFormStore
				.getState()
				.undoRequestGenerationProposal("proposal-saved-commercial-edit-1"),
		).toEqual({
			status: "selective-removed",
			removedLineUids: [],
			retainedLineUids: ["generated-door"],
		});
		const retained = useNewSalesFormStore.getState().record?.lineItems[0];
		expect(retained?.id).toBe(151);
		expect(retained?.description).toBe("User-authored commercial note");
		expect(
			useNewSalesFormStore.getState().requestGeneration.manualSaveRequired,
		).toBe(true);
	});

	it("keeps request-generation metadata out of the canonical save payload", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-save-shape-1",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");
		useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal, "config-1");
		const record = useNewSalesFormStore.getState().record;
		if (!record) throw new Error("Expected applied record");
		const payload = toSaveDraftInput(record, true) as Record<string, unknown>;
		const serializedPayload = JSON.stringify(payload);

		expect(Object.hasOwn(payload, "requestGeneration")).toBe(false);
		expect(Object.hasOwn(payload, "proposalId")).toBe(false);
		expect(Object.hasOwn(payload, "configurationRevision")).toBe(false);
		expect(Object.hasOwn(payload, "unresolved")).toBe(false);
		expect(serializedPayload).not.toContain('"requestGeneration"');
		expect(serializedPayload).not.toContain('"proposalId"');
		expect(serializedPayload).not.toContain('"configurationRevision"');
		expect(serializedPayload).not.toContain('"unresolved"');
		expect(serializedPayload).not.toContain("proposal-save-shape-1");
	});

	it("retains an ephemeral final-save claim only for the exact applied record", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "11111111-1111-4111-8111-111111111111",
			configurationRevision: "config-1",
			seed: doorSeed,
			baseRecord,
			routeData: doorRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
		});
		if (prepared.status !== "ready") throw new Error("Expected ready proposal");
		const lowTouchClaim = {
			source: "pasted-text" as const,
			generationId: "11111111-1111-4111-8111-111111111111",
			configurationScope: "sales-settings:7",
			configurationRevision: "config-1",
			provider: "openai" as const,
			model: "gpt-5-mini",
			seed: doorSeed,
		};
		useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(
				{ ...prepared.proposal, lowTouchClaim },
				"config-1",
			);

		let state = useNewSalesFormStore.getState();
		expect(
			getFreshRequestGenerationLowTouchClaim(
				state.record,
				state.requestGeneration,
			),
		).toEqual(lowTouchClaim);
		expect(state.requestGeneration.manualSaveRequired).toBe(true);

		useNewSalesFormStore
			.getState()
			.updateLineItem("generated-door", { description: "Representative edit" });
		state = useNewSalesFormStore.getState();
		expect(state.requestGeneration.lowTouchClaim).toBeNull();
		expect(
			getFreshRequestGenerationLowTouchClaim(
				state.record,
				state.requestGeneration,
			),
		).toBeNull();
		// The explicit-save hold remains, so an edited generated draft still
		// cannot enter autosave even after its low-touch provenance is stale.
		expect(state.requestGeneration.manualSaveRequired).toBe(true);
	});
});
