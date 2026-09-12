import { beforeEach, describe, expect, it } from "bun:test";
import {
	type NewSalesFormSeed,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
} from "@gnd/sales/sales-form";
import {
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
			.applyRequestGenerationProposal(prepared.proposal);
		expect(applied).toEqual({ status: "applied" });
		expect(notifications).toBe(1);
		const appliedState = useNewSalesFormStore.getState();
		expect(appliedState.dirty).toBe(true);
		expect(appliedState.requestGeneration.phase).toBe("idle");
		expect(appliedState.requestGeneration.autosaveSuspended).toBe(false);
		expect(appliedState.requestGeneration.appliedProposalIds).toEqual([
			"proposal-door-1",
		]);

		const duplicate = useNewSalesFormStore
			.getState()
			.applyRequestGenerationProposal(prepared.proposal);
		expect(duplicate).toEqual({ status: "already-applied" });
		expect(notifications).toBe(1);

		const undo = useNewSalesFormStore
			.getState()
			.undoRequestGenerationProposal("proposal-door-1");
		expect(undo).toEqual({ status: "restored" });
		expect(useNewSalesFormStore.getState().record?.lineItems).toEqual(
			baseRecord.lineItems,
		);
		unsubscribe();
	});

	it("keeps invalid component identities isolated from the store", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		useNewSalesFormStore.getState().setRequestGenerationPhase("reviewing");

		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-invalid-1",
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
				.applyRequestGenerationProposal(prepared.proposal),
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
	});

	it("rejects a prepared proposal when the form revision changes before apply", async () => {
		const baseRecord = createRecord();
		useNewSalesFormStore.getState().hydrate(baseRecord);
		const prepared = await prepareRequestGenerationProposal({
			proposalId: "proposal-stale-1",
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
				.applyRequestGenerationProposal(prepared.proposal),
		).toEqual({ status: "stale" });
		expect(
			useNewSalesFormStore
				.getState()
				.record?.lineItems.some((line) => line.uid === "generated-door"),
		).toBe(false);
	});
});
