import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	saveDraftNewSalesFormSchema,
	saveFinalNewSalesFormSchema,
} from "@api/schemas/new-sales-form";
import {
	type NewSalesFormSeed,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	hydrateSalesFormRecord,
	initializeNewSalesFormSeed,
	salesFormLineItemSchema,
} from "@gnd/sales/sales-form";
import { toSaveDraftInput } from "./mappers";

const doorRouteData: WorkflowRouteData = {
	rootStepUid: "item-type",
	composedRouter: {
		exterior: {
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
	1: [{ id: 10, uid: "exterior", title: "Exterior Door", basePrice: 0 }],
	2: [{ id: 20, uid: "fiberglass", title: "Fiberglass Frame", basePrice: 30 }],
	3: [
		{
			id: 30,
			uid: "panel",
			title: "Panel Door",
			basePrice: 100,
			pricing: {
				"2-6 x 6-8": { basePrice: 120 },
				"3-0 x 6-8": { basePrice: 150 },
			},
		},
	],
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
		{
			id: 2153,
			uid: "attic-access",
			title: "ATTIC ACCESS KIT",
			basePrice: 20,
		},
	],
	217: [],
};

function orderBaseRecord() {
	return {
		type: "order" as const,
		salesId: null,
		slug: null,
		version: "new-generated-order",
		form: {
			customerId: 100,
			customerProfileId: 7,
			paymentMethod: "Credit Card",
		},
		lineItems: [],
		extraCosts: [],
		summary: { taxRate: 0 },
	};
}

function quoteBaseRecord() {
	return {
		type: "quote" as const,
		salesId: null,
		slug: null,
		version: "new-generated-quote",
		form: { customerId: 100, customerProfileId: 7 },
		lineItems: [],
		extraCosts: [],
		summary: { taxRate: 0 },
	};
}

async function initializeDoorOrder() {
	const seed: NewSalesFormSeed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "generated-door-order",
				qty: 3,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 2, prodUid: "fiberglass" },
					{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
				],
				housePackageTool: {
					doors: [
						{
							dimension: "2-6 x 6-8",
							swing: "inswing",
							lhQty: 1,
							rhQty: 0,
						},
						{
							dimension: "3-0 x 6-8",
							swing: "outswing",
							lhQty: 0,
							rhQty: 2,
						},
					],
				},
			},
		],
		unresolved: [],
	};

	return initializeNewSalesFormSeed({
		seed,
		baseRecord: orderBaseRecord(),
		routeData: doorRouteData,
		pricing: { profileCoefficient: 0.5 },
		resolveComponents: ({ step }) => doorComponents[Number(step.id)] || [],
	});
}

async function initializeMouldingQuote() {
	const seed: NewSalesFormSeed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "generated-moulding-quote",
				qty: 32,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: {
							selectedProdUids: ["baseboard-16", "casing-17", "attic-access"],
						},
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
						{ uid: "attic-access", qty: 1 },
					],
				},
			},
		],
		unresolved: [],
	};

	return initializeNewSalesFormSeed({
		seed,
		baseRecord: quoteBaseRecord(),
		routeData: mouldingRouteData,
		pricing: { profileCoefficient: 0.5 },
		resolveComponents: ({ step }) => mouldingComponents[Number(step.id)] || [],
	});
}

function saveBoundaryPayloads(record: Parameters<typeof toSaveDraftInput>[0]) {
	const draft = toSaveDraftInput(record, false, "draft");
	const final = toSaveDraftInput(record, false, "final");

	return {
		draft: saveDraftNewSalesFormSchema.parse(draft),
		final: saveFinalNewSalesFormSchema.parse(final),
	};
}

function reopenSavedPayload(
	record: Parameters<typeof toSaveDraftInput>[0],
	payload: ReturnType<typeof toSaveDraftInput>,
) {
	return hydrateSalesFormRecord({
		...record,
		salesId: 701,
		slug: "saved-generated-form",
		version: "saved-generated-form-v2",
		form: payload.meta,
		lineItems: payload.lineItems,
		extraCosts: payload.extraCosts,
		summary: payload.summary,
	});
}

describe("Sales Request Generation native save/reopen proof", () => {
	test("keeps an applied Door/HPT order intact at draft and final boundaries", async () => {
		const initialized = await initializeDoorOrder();
		expect(initialized.issues).toEqual([]);
		expect(initialized.unresolved).toEqual([]);

		const { draft, final } = saveBoundaryPayloads(initialized.record);
		for (const payload of [draft, final]) {
			expect(payload.autosave).toBe(false);
			expect(
				payload.lineItems.every(
					(line) => salesFormLineItemSchema.safeParse(line).success,
				),
			).toBe(true);
			expect(JSON.stringify(payload)).not.toContain("requestGeneration");
		}
		expect(draft.commitIntent).toBe("draft");
		expect(final.commitIntent).toBe("final");

		const reopened = reopenSavedPayload(initialized.record, final);
		const line = reopened.lineItems[0];
		expect(line).toMatchObject({
			uid: "generated-door-order",
			qty: 3,
			unitPrice: 340,
			lineTotal: 1020,
		});
		expect(line?.formSteps?.[2]?.meta).toMatchObject({
			selectedProdUids: ["panel"],
			selectedComponents: [expect.objectContaining({ uid: "panel", id: 30 })],
		});
		expect(line?.housePackageTool?.doors).toMatchObject([
			{
				dimension: "2-6 x 6-8",
				swing: "inswing",
				lhQty: 1,
				rhQty: 0,
				totalQty: 1,
				unitPrice: 300,
				lineTotal: 300,
			},
			{
				dimension: "3-0 x 6-8",
				swing: "outswing",
				lhQty: 0,
				rhQty: 2,
				totalQty: 2,
				unitPrice: 360,
				lineTotal: 720,
			},
		]);
		expect(reopened.summary).toEqual(final.summary);
	});

	test("keeps Mouldings multi-selection and mixed quantities priced after quote reopen", async () => {
		const initialized = await initializeMouldingQuote();
		expect(initialized.issues).toEqual([]);
		expect(initialized.unresolved).toEqual([]);

		const { draft, final } = saveBoundaryPayloads(initialized.record);
		expect(draft.commitIntent).toBe("draft");
		expect(final.commitIntent).toBe("final");
		expect(JSON.stringify(final)).not.toContain("requestGeneration");

		const reopened = reopenSavedPayload(initialized.record, final);
		const line = reopened.lineItems[0];
		expect(line).toMatchObject({
			uid: "generated-moulding-quote",
			title: "Mouldings",
			qty: 32,
			unitPrice: 21.56,
			lineTotal: 690,
		});
		expect(line?.formSteps?.[1]?.meta?.selectedProdUids).toEqual([
			"baseboard-16",
			"casing-17",
			"attic-access",
		]);
		expect(
			(line?.meta?.mouldingRows || []).map((row: Record<string, unknown>) => ({
				uid: row.uid,
				qty: row.qty,
				salesPrice: row.salesPrice,
				lineTotal: row.lineTotal,
			})),
		).toEqual([
			{ uid: "baseboard-16", qty: 28, salesPrice: 20, lineTotal: 560 },
			{ uid: "casing-17", qty: 3, salesPrice: 30, lineTotal: 90 },
			{ uid: "attic-access", qty: 1, salesPrice: 40, lineTotal: 40 },
		]);
		expect(reopened.summary).toEqual(final.summary);
	});

	test("does not schedule or retain an unapplied preview while the review panel is open", () => {
		const source = readFileSync(
			new URL("./new-sales-form.tsx", import.meta.url),
			"utf8",
		);
		expect(source).toContain("!requestGeneration.autosaveSuspended");
		expect(source).toContain("!requestGeneration.manualSaveRequired");
		expect(source).toContain("autosave.cancelPending()");
		expect(source).toContain(
			'setRequestGenerationPhase(open ? "reviewing" : "idle")',
		);
		expect(source).toContain('commitIntent: "final"');
	});

	test("blocks generated-draft document actions before their persistence flush", () => {
		const source = readFileSync(
			new URL("./new-sales-form.tsx", import.meta.url),
			"utf8",
		);
		const handlers = [
			["async function handlePrint(", "async function handleDownloadPdf("],
			["async function handleDownloadPdf(", "async function handlePreview("],
			["async function handlePreview(", "function handleOpenOverview("],
		] as const;

		for (const [startToken, endToken] of handlers) {
			const start = source.indexOf(startToken);
			const end = source.indexOf(endToken, start + 1);
			const handler = source.slice(start, end);
			const holdGuard = handler.indexOf(
				"if (requestGeneration.manualSaveRequired)",
			);
			const persistenceFlush = handler.indexOf("autosave.flush");

			expect(start).toBeGreaterThanOrEqual(0);
			expect(end).toBeGreaterThan(start);
			expect(holdGuard).toBeGreaterThanOrEqual(0);
			expect(persistenceFlush).toBeGreaterThan(holdGuard);
		}
	});
});
