import { describe, expect, it } from "bun:test";
import {
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
} from "@gnd/sales/sales-form";
import {
	buildApprovedSalesRequestInvoicePreview,
	openApprovedSalesRequestInvoicePreview,
} from "./request-generation-invoice-preview";
import {
	createInitialRequestGenerationState,
	getRequestGenerationRecordRevision,
} from "./request-generation-transaction";
import type { NewSalesFormRecord } from "./schema";

function nativeUnsavedRecord() {
	return hydrateSalesFormRecord({
		type: "order",
		salesId: null,
		slug: null,
		orderId: null,
		version: "new-generated-preview",
		updatedAt: "2026-09-13T12:00:00.000Z",
		customer: {
			id: 20,
			name: "Sample Customer",
			businessName: "Sample Construction",
		},
		form: {
			customerId: 20,
			po: "SAMPLE-PO",
			createdAt: "2026-09-13T12:00:00.000Z",
			paymentMethod: "Check",
		},
		lineItems: [
			{
				...createEmptySalesFormLineItem(0),
				uid: "generated-line",
				title: "Interior door slab",
				description: "Smooth primed solid-core slab",
				qty: 2,
				unitPrice: 150,
				lineTotal: 300,
			},
		],
		extraCosts: [],
		summary: {
			taxRate: 0,
			subTotal: 300,
			taxTotal: 0,
			grandTotal: 300,
			amountDue: 300,
		},
	}) as NewSalesFormRecord;
}

function appliedGenerationState(record: NewSalesFormRecord) {
	const state = createInitialRequestGenerationState();
	return {
		...state,
		manualSaveRequired: true,
		undo: {
			proposalId: "11111111-1111-4111-8111-111111111111",
			beforeRevision: "before",
			afterRevision: getRequestGenerationRecordRevision(record),
			beforeRecord: structuredClone(record),
			beforeStore: {
				dirty: false,
				saveStatus: "idle" as const,
				lastSaveError: null,
				lastSavedAt: null,
				editor: {
					activeLineUid: null,
					activeStepByLine: {},
					collapsedLineUids: [],
					showMobileSummary: false,
					autosaveEnabled: true,
				},
			},
			selectiveRemoval: {
				generatedLineUids: ["generated-line"],
				generatedLines: structuredClone(record.lineItems),
				replacedBootstrapLine: null,
				beforeForm: structuredClone(record.form),
				appliedForm: structuredClone(record.form),
				beforeExtraCosts: [],
				appliedExtraCosts: [],
			},
		},
	};
}

describe("Sales Request Generation in-memory invoice preview", () => {
	it("opens the composed in-memory page through the Preview action boundary", () => {
		const record = nativeUnsavedRecord();
		let opened = null as ReturnType<
			typeof buildApprovedSalesRequestInvoicePreview
		> | null;
		const page = openApprovedSalesRequestInvoicePreview(
			{
				record,
				requestGeneration: appliedGenerationState(record),
			},
			(value) => {
				opened = value;
			},
		);

		expect(opened).toBe(page);
		expect(page.meta.salesNo).toBe("DRAFT ORDER");
		expect(record.salesId).toBeNull();
	});

	it("composes the native unsaved record without mutating or persisting it", () => {
		const record = nativeUnsavedRecord();
		const before = structuredClone(record);
		const page = buildApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: appliedGenerationState(record),
			billingAddress: {
				name: "Sample Construction",
				address1: "100 Sample Way",
				city: "Miami",
				state: "FL",
			},
		});

		expect(page.config.mode).toBe("invoice");
		expect(page.meta.salesNo).toBe("DRAFT ORDER");
		expect(page.meta.total).toContain(
			Number(record.summary.grandTotal).toFixed(2),
		);
		expect(page.billing.lines).toContain("100 Sample Way");
		expect(page.sections).toHaveLength(1);
		expect(page.sections[0]?.kind).toBe("line-item");
		expect(record).toEqual(before);
		expect(record.salesId).toBeNull();
	});

	it("remains available after crash recovery without persisting undo data", () => {
		const record = nativeUnsavedRecord();
		const page = buildApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: { manualSaveRequired: true },
		});

		expect(page.meta.salesNo).toBe("DRAFT ORDER");
		expect(page.sections).toHaveLength(1);
	});

	it("rejects previews before human Apply or after persistence", () => {
		const record = nativeUnsavedRecord();
		expect(() =>
			buildApprovedSalesRequestInvoicePreview({
				record,
				requestGeneration: createInitialRequestGenerationState(),
			}),
		).toThrow("human-applied proposal");

		expect(() =>
			buildApprovedSalesRequestInvoicePreview({
				record: { ...record, salesId: 91, slug: "ORD-91" },
				requestGeneration: appliedGenerationState(record),
			}),
		).toThrow("unsaved sales form");
	});
});
