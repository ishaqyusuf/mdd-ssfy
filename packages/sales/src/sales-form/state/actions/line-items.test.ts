import { describe, expect, it } from "bun:test";
import { createInitialSalesFormState } from "../initial-state";
import type { SalesFormStateRecord } from "../types";
import {
	addSalesFormLineItem,
	duplicateSalesFormLineItem,
	moveSalesFormLineItem,
	removeSalesFormLineItem,
	updateSalesFormLineItem,
} from "./line-items";
import {
	hydrateSalesFormState,
	restoreSalesFormLocalDraft,
	setSalesFormCustomerProfileMeta,
} from "./meta";
import {
	markSalesFormError,
	markSalesFormSaved,
	markSalesFormSaving,
} from "./save";
import { setSalesFormTaxRate } from "./summary";

function createRecord(): SalesFormStateRecord {
	return {
		type: "quote",
		salesId: null,
		slug: "Q-1",
		version: "v1",
		updatedAt: "2026-05-18T00:00:00.000Z",
		form: {
			paymentMethod: null,
		},
		lineItems: [
			{
				id: null,
				uid: "line-1",
				title: "Line 1",
				description: "",
				qty: 2,
				unitPrice: 10,
				lineTotal: 20,
				meta: {},
				formSteps: [],
				shelfItems: [],
				housePackageTool: null,
			},
		],
		extraCosts: [],
		summary: {
			taxRate: 0,
			subTotal: 20,
			grandTotal: 20,
		},
	};
}

describe("sales form state line item actions", () => {
	it("disables autosave by default for hydrated forms", () => {
		const state = hydrateSalesFormState(
			createInitialSalesFormState(),
			createRecord(),
		);

		expect(state.dirty).toBe(false);
		expect(state.saveStatus).toBe("idle");
		expect(state.editor.autosaveEnabled).toBe(false);
		expect(state.editor.activeItem).toBe("line-1");
		expect(state.editor.activeStepByLine).toEqual({ "line-1": 0 });
	});

	it("hydrates active steps from each loaded line item workflow", () => {
		const record: SalesFormStateRecord = {
			...createRecord(),
			lineItems: [
				{
					...createRecord().lineItems[0],
					uid: "line-complete",
					formSteps: [
						{
							prodUid: "door-root",
							step: { title: "Item Type" },
							meta: {},
						},
						{
							prodUid: "height-80",
							step: { title: "Height" },
							meta: {},
						},
						{
							prodUid: "line-item",
							step: { title: "Line Item" },
							meta: {},
						},
					],
				},
				{
					...createRecord().lineItems[0],
					uid: "line-pending",
					formSteps: [
						{
							prodUid: "shelf-root",
							step: { title: "Item Type" },
							meta: {},
						},
						{
							prodUid: "",
							step: { title: "Shelf Items" },
							meta: {},
						},
					],
				},
			],
		};
		const state = hydrateSalesFormState(createInitialSalesFormState(), record);

		expect(state.editor.activeItem).toBe("line-complete");
		expect(state.editor.activeStepByLine).toEqual({
			"line-complete": 2,
			"line-pending": 1,
		});
	});

	it("updates line totals and marks state dirty", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = updateSalesFormLineItem(state, "line-1", {
			qty: 3,
			unitPrice: 15,
		});

		expect(next.dirty).toBe(true);
		expect(next.record?.lineItems[0]?.lineTotal).toBe(45);
		expect(next.record?.summary?.subTotal).toBe(45);
	});

	it("returns the same state for an idempotent normalized patch", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = updateSalesFormLineItem(state, "line-1", {
			qty: 2,
			unitPrice: 10,
			lineTotal: 20,
		});

		expect(next).toBe(state);
	});

	it("preserves spaces while editing an item title", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};
		const withSpace = updateSalesFormLineItem(state, "line-1", {
			title: "INTERIOR ",
		});
		const withNextWord = updateSalesFormLineItem(withSpace, "line-1", {
			title: `${withSpace.record?.lineItems[0]?.title}DOOR`,
		});

		expect(withSpace.record?.lineItems[0]?.title).toBe("INTERIOR ");
		expect(withNextWord.record?.lineItems[0]?.title).toBe("INTERIOR DOOR");
	});

	it("sets the new line active when adding a line", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = addSalesFormLineItem(state, {
			uid: "line-2",
			title: "Custom",
			qty: 1,
			unitPrice: 25,
		});

		expect(next.editor.activeItem).toBe("line-2");
		expect(next.record?.lineItems).toHaveLength(2);
		expect(next.record?.summary?.subTotal).toBe(45);
	});

	it("duplicates a configured line after its source with fresh persistence identities", () => {
		const source = {
			...createRecord().lineItems[0],
			id: 41,
			meta: {
				serviceRows: [
					{
						id: 51,
						uid: "service-1",
						salesItemId: 41,
						hptId: 61,
						service: "Install",
					},
				],
				mouldingRows: [
					{
						id: 52,
						uid: "moulding-1",
						salesItemId: 42,
						hptId: 62,
						description: "Casing",
					},
				],
			},
			formSteps: [{ id: 71, stepId: 7, value: "Oak" }],
			shelfItems: [{ id: 81, categoryId: 8, description: "Shelf" }],
			housePackageTool: {
				id: 91,
				doorType: "Interior",
				totalDoors: 1,
				totalPrice: 20,
				doors: [
					{
						id: 101,
						dimension: "2-6 x 6-8",
						lhQty: 1,
						totalQty: 1,
						unitPrice: 20,
						lineTotal: 20,
					},
				],
			},
		};
		const state = {
			...createInitialSalesFormState(),
			record: {
				...createRecord(),
				lineItems: [source],
			},
		};

		const next = duplicateSalesFormLineItem(state, "line-1");
		const copy = next.record?.lineItems[1];
		const copyMeta = copy?.meta as {
			serviceRows?: Array<Record<string, unknown>>;
			mouldingRows?: Array<Record<string, unknown>>;
		};

		expect(next.record?.lineItems).toHaveLength(2);
		expect(copy?.uid).not.toBe("line-1");
		expect(copy?.id).toBe(null);
		expect(copy?.formSteps?.[0]?.id).toBe(null);
		expect(copy?.shelfItems?.[0]?.id).toBe(null);
		expect(copy?.housePackageTool?.id).toBe(null);
		expect(copy?.housePackageTool?.doors?.[0]?.id).toBe(null);
		expect(copyMeta.serviceRows?.[0]).toMatchObject({
			id: null,
			salesItemId: null,
			hptId: null,
		});
		expect(copyMeta.mouldingRows?.[0]).toMatchObject({
			id: null,
			salesItemId: null,
			hptId: null,
		});
		expect(copy?.formSteps).not.toBe(source.formSteps);
		expect(copy?.housePackageTool).not.toBe(source.housePackageTool);
		expect(next.editor.activeItem).toBe(copy?.uid);
		expect(next.record?.summary?.subTotal).toBe(40);
		expect(next.dirty).toBe(true);
	});

	it("moves a line by swapping it with the selected legacy position", () => {
		const lineOne = createRecord().lineItems[0];
		const state = {
			...createInitialSalesFormState(),
			record: {
				...createRecord(),
				lineItems: [
					lineOne,
					{ ...lineOne, id: null, uid: "line-2", title: "Line 2" },
					{ ...lineOne, id: null, uid: "line-3", title: "Line 3" },
				],
			},
			editor: {
				...createInitialSalesFormState().editor,
				activeItem: "line-1",
				activeStepByLine: { "line-1": 0 },
			},
		};

		const next = moveSalesFormLineItem(state, "line-1", 2);

		expect(next.record?.lineItems.map((line) => line.uid)).toEqual([
			"line-3",
			"line-2",
			"line-1",
		]);
		expect(next.editor.activeItem).toBe("line-1");
		expect(next.record?.summary?.subTotal).toBe(60);
		expect(next.dirty).toBe(true);
	});

	it("moves active item when removing the active line", () => {
		const state = addSalesFormLineItem(
			{
				...createInitialSalesFormState(),
				record: createRecord(),
			},
			{
				uid: "line-2",
				title: "Custom",
				qty: 1,
				unitPrice: 25,
			},
		);

		const next = removeSalesFormLineItem(state, "line-2");

		expect(next.editor.activeItem).toBe("line-1");
		expect(next.record?.lineItems.map((line) => line.uid)).toEqual(["line-1"]);
	});
});

describe("sales form state save/recovery actions", () => {
	it("keeps dirty edits after save errors and clears error status on the next edit", () => {
		const errored = markSalesFormError(
			{
				...createInitialSalesFormState(),
				record: createRecord(),
				dirty: true,
			},
			"Autosave failed.",
		);

		expect(errored.dirty).toBe(true);
		expect(errored.saveStatus).toBe("error");

		const edited = updateSalesFormLineItem(errored, "line-1", {
			qty: 4,
		});

		expect(edited.dirty).toBe(true);
		expect(edited.saveStatus).toBe("idle");
		expect(edited.record?.lineItems[0]?.lineTotal).toBe(40);
	});

	it("marks successful saves clean and updates version timestamps", () => {
		const saving = markSalesFormSaving({
			...createInitialSalesFormState(),
			record: createRecord(),
			dirty: true,
		});

		expect(saving.saveStatus).toBe("saving");
		expect(saving.dirty).toBe(true);

		const saved = markSalesFormSaved(saving, {
			version: "v2",
			updatedAt: "2026-05-20T10:00:00.000Z",
		});

		expect(saved.dirty).toBe(false);
		expect(saved.saveStatus).toBe("saved");
		expect(saved.record?.version).toBe("v2");
		expect(saved.record?.updatedAt).toBe("2026-05-20T10:00:00.000Z");
		expect(saved.lastSavedAt).toBe("2026-05-20T10:00:00.000Z");
	});

	it("keeps a newer edit dirty when an older autosave finishes", () => {
		const saving = markSalesFormSaving({
			...createInitialSalesFormState(),
			record: createRecord(),
			dirty: true,
		});

		const saved = markSalesFormSaved(saving, {
			version: "v2",
			updatedAt: "2026-05-20T10:00:00.000Z",
			preserveDirty: true,
		});

		expect(saved.dirty).toBe(true);
		expect(saved.saveStatus).toBe("idle");
		expect(saved.record?.version).toBe("v2");
	});

	it("restores local drafts as dirty without replacing editor preferences", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
			editor: {
				...createInitialSalesFormState().editor,
				activeItem: "line-1",
				stepDisplayMode: "compact" as const,
				autosaveEnabled: false,
			},
		};

		const recoveredRecord: SalesFormStateRecord = {
			...createRecord(),
			lineItems: [
				{
					...createRecord().lineItems[0],
					uid: "line-recovered",
					qty: 5,
					unitPrice: 7,
					lineTotal: 35,
				},
			],
			summary: {
				subTotal: 35,
				grandTotal: 35,
			},
		};
		const restored = restoreSalesFormLocalDraft(state, recoveredRecord);

		expect(restored.dirty).toBe(true);
		expect(restored.saveStatus).toBe("idle");
		expect(restored.editor.stepDisplayMode).toBe("compact");
		expect(restored.editor.autosaveEnabled).toBe(false);
		expect(restored.editor.activeItem).toBe("line-recovered");
		expect(restored.editor.activeStepByLine["line-recovered"]).toBe(0);
		expect(restored.record?.summary?.subTotal).toBe(35);
	});
});

describe("sales form state summary actions", () => {
	it("recomputes summary when tax rate changes", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = setSalesFormTaxRate(state, 10);

		expect(next.dirty).toBe(true);
		expect(next.record?.summary?.taxRate).toBe(10);
		expect(next.record?.summary?.taxTotal).toBe(2);
		expect(next.record?.summary?.grandTotal).toBe(22);
	});
});

describe("sales form state profile actions", () => {
	it("updates profile meta, reprices lines, and recomputes tax totals atomically", () => {
		const state = {
			...createInitialSalesFormState(),
			record: {
				...createRecord(),
				form: {
					customerProfileId: 1,
					paymentMethod: null,
					paymentTerm: "None",
				},
				lineItems: [
					{
						id: null,
						uid: "line-1",
						title: "Line 1",
						description: "",
						qty: 2,
						unitPrice: 50,
						lineTotal: 100,
						meta: {},
						formSteps: [
							{
								price: 50,
								basePrice: 100,
							},
						],
						shelfItems: [],
						housePackageTool: null,
					},
				],
				summary: {
					taxRate: 10,
					subTotal: 100,
					taxTotal: 10,
					grandTotal: 110,
				},
			},
		};

		const next = setSalesFormCustomerProfileMeta(
			state,
			{ customerProfileId: 2, paymentTerm: "Net 30" },
			2,
			4,
		);

		expect(next.dirty).toBe(true);
		expect(next.record?.form.customerProfileId).toBe(2);
		expect(next.record?.form.paymentTerm).toBe("Net 30");
		expect(next.record?.lineItems[0]?.unitPrice).toBe(25);
		expect(next.record?.lineItems[0]?.lineTotal).toBe(50);
		expect(next.record?.summary?.subTotal).toBe(50);
		expect(next.record?.summary?.taxTotal).toBe(5);
		expect(next.record?.summary?.grandTotal).toBe(55);
	});
});
