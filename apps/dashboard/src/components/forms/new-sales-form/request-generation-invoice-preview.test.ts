import { describe, expect, it } from "bun:test";
import {
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
} from "@gnd/sales/sales-form";
import {
	SalesRequestInvoicePreviewStaleError,
	buildApprovedSalesRequestInvoicePreview,
	openApprovedSalesRequestInvoicePreview,
	openCurrentApprovedSalesRequestInvoicePreview,
	resolveApprovedSalesRequestInvoicePreviewContext,
} from "./request-generation-invoice-preview";
import {
	type RequestGenerationState,
	createInitialRequestGenerationState,
	getRequestGenerationRecordRevision,
} from "./request-generation-transaction";
import type {
	NewSalesFormPrintContext,
	NewSalesFormRecord,
	NewSalesFormResolvedCustomer,
} from "./schema";

type ResolvedCustomerPreviewContext = Pick<
	NewSalesFormResolvedCustomer,
	"customer" | "billingAddress" | "shippingAddress"
>;
type PreviewPrintContext = NewSalesFormPrintContext;

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
	}) as unknown as NewSalesFormRecord;
}

function appliedGenerationState(
	record: NewSalesFormRecord,
): RequestGenerationState {
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
					stepDisplayMode: "compact",
					activeItem: null,
					activeStepByLine: {},
					doorViewMode: "selection",
					mouldingViewMode: "selection",
					isOverviewOpen: false,
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
	it("uses the authoritative resolved customer addresses and loaded print setting", () => {
		const billingAddress = {
			addressId: 201,
			name: "Sample Construction",
			address1: "100 Billing Way",
			address2: "",
			city: "Miami",
			country: "",
			formattedAddress: "",
			lat: 0,
			lng: 0,
			placeId: "",
			state: "FL",
			zip_code: "33101",
			email: "billing@example.com",
			phoneNo: "305-555-0200",
			phoneNo2: "305-555-0201",
		};
		const shippingAddress = {
			addressId: 202,
			name: "Sample Jobsite",
			address1: "200 Shipping Way",
			address2: "",
			city: "Miami",
			country: "",
			formattedAddress: "",
			lat: 0,
			lng: 0,
			placeId: "",
			state: "FL",
			zip_code: "33102",
			email: "shipping@example.com",
			phoneNo: "305-555-0300",
			phoneNo2: null,
		};
		const settingsMeta = {
			route: {
				"interior-door": {
					config: { hasSwing: false, noHandle: true },
				},
			},
		};

		const context = resolveApprovedSalesRequestInvoicePreviewContext({
			resolvedCustomer: {
				customer: {
					name: "Sample Customer",
					businessName: "Sample Construction",
					phone: "305-555-0100",
					phoneNo: "305-555-0100",
					phoneNo2: null,
					email: "sample@example.com",
					address: null,
				},
				billingAddress,
				shippingAddress,
			},
			printContext: {
				settingId: 7,
				settingsMeta,
			},
		});
		expect(context).toEqual({
			customer: {
				name: "Sample Customer",
				businessName: "Sample Construction",
				phone: "305-555-0100",
				phoneNo: "305-555-0100",
				phoneNo2: null,
				email: "sample@example.com",
				address: null,
			},
			billingAddress: {
				...billingAddress,
				meta: { zip_code: "33101" },
			},
			shippingAddress: {
				...shippingAddress,
				meta: { zip_code: "33102" },
			},
			setting: {
				id: 7,
				data: settingsMeta,
			},
		});

		const record = nativeUnsavedRecord();
		const page = buildApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: appliedGenerationState(record),
			...context,
		});
		expect(page.billing.lines).toContain("305-555-0200 (305-555-0201)");
		expect(page.billing.lines).toContain("billing@example.com");
		expect(page.billing.lines).toContain("Miami FL 33101");
		expect(page.shipping.lines).toContain("shipping@example.com");
		expect(page.shipping.lines).toContain("Miami FL 33102");
	});

	it("uses the billing address when the resolved shipping address is absent", () => {
		const record = nativeUnsavedRecord();
		const context = resolveApprovedSalesRequestInvoicePreviewContext({
			resolvedCustomer: {
				customer: {
					name: "Sample Customer",
					businessName: null,
					phone: "305-555-0100",
					phoneNo: "305-555-0100",
					phoneNo2: null,
					email: "sample@example.com",
					address: null,
				},
				billingAddress: {
					addressId: 201,
					name: "Sample Construction",
					address1: "100 Billing Way",
					address2: "",
					city: "Miami",
					country: "",
					formattedAddress: "",
					lat: 0,
					lng: 0,
					placeId: "",
					state: "FL",
					zip_code: "33101",
					email: null,
					phoneNo: null,
					phoneNo2: null,
				},
				shippingAddress: null,
			},
			printContext: { settingId: 7, settingsMeta: {} },
		});

		const page = buildApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: appliedGenerationState(record),
			...context,
		});
		expect(page.shipping.lines).toContain("100 Billing Way");
		expect(page.shipping.lines).toContain("Miami FL 33101");
	});

	it("waits for fresh preview context and rejects record drift or read failure", async () => {
		const record = nativeUnsavedRecord();
		let resolveCustomer!: (value: ResolvedCustomerPreviewContext) => void;
		let resolvePrintContext!: (value: PreviewPrintContext) => void;
		const customerPromise = new Promise<ResolvedCustomerPreviewContext>(
			(resolve) => {
				resolveCustomer = resolve;
			},
		);
		const printContextPromise = new Promise<PreviewPrintContext>((resolve) => {
			resolvePrintContext = resolve;
		});
		let opened = false;
		const pending = openCurrentApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: appliedGenerationState(record),
			loadResolvedCustomer: () => customerPromise,
			loadPrintContext: () => printContextPromise,
			getCurrentRecord: () => record,
			validateCurrentRecord: () => true,
			open: () => {
				opened = true;
			},
		});
		resolveCustomer({
			customer: {
				name: "Sample Customer",
				businessName: null,
				phone: null,
				phoneNo: null,
				phoneNo2: null,
				email: null,
				address: null,
			},
			billingAddress: null,
			shippingAddress: null,
		});
		await Promise.resolve();
		expect(opened).toBe(false);
		resolvePrintContext({ settingId: 7, settingsMeta: {} });
		await pending;
		expect(opened).toBe(true);

		let driftError: unknown;
		try {
			await openCurrentApprovedSalesRequestInvoicePreview({
				record,
				requestGeneration: appliedGenerationState(record),
				loadResolvedCustomer: async () => ({
					customer: {
						name: "Sample Customer",
						businessName: null,
						phone: null,
						phoneNo: null,
						phoneNo2: null,
						email: null,
						address: null,
					},
					billingAddress: null,
					shippingAddress: null,
				}),
				loadPrintContext: async () => ({ settingId: 7, settingsMeta: {} }),
				getCurrentRecord: () => ({ ...record }),
				validateCurrentRecord: () => true,
				open: () => {
					throw new Error("must not open");
				},
			});
		} catch (error) {
			driftError = error;
		}
		expect(driftError instanceof SalesRequestInvoicePreviewStaleError).toBe(
			true,
		);

		let readError: unknown;
		try {
			await openCurrentApprovedSalesRequestInvoicePreview({
				record,
				requestGeneration: appliedGenerationState(record),
				loadResolvedCustomer: async () => {
					throw new Error("customer read failed");
				},
				loadPrintContext: async () => ({ settingId: 7, settingsMeta: {} }),
				getCurrentRecord: () => record,
				validateCurrentRecord: () => true,
				open: () => {
					throw new Error("must not open");
				},
			});
		} catch (error) {
			readError = error;
		}
		expect(readError instanceof Error).toBe(true);
		expect((readError as Error).message).toBe("customer read failed");
	});

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

	it("uses the native configured card rate in the unsaved invoice preview", () => {
		const record = nativeUnsavedRecord();
		record.form.paymentMethod = "Credit Card";
		record.settings = { cccPercentage: 3 };
		const page = buildApprovedSalesRequestInvoicePreview({
			record,
			requestGeneration: appliedGenerationState(record),
		});
		const lines = page.footer?.lines ?? [];
		expect(lines.find((line) => line.label === "Order Due Amount")?.value).toBe("$300.00");
		expect(lines.find((line) => line.label === "Estimated Card Fee")?.value).toBe("$9.00");
		expect(lines.find((line) => line.label === "Total if Paying by Card")?.value).toBe("$309.00");
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
