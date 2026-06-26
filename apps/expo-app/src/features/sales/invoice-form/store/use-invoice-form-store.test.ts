import { beforeEach, describe, expect, it } from "bun:test";
import { createMockNewSalesFormRecord, invoiceCustomers } from "../mock-data";
import { useInvoiceFormStore } from "./use-invoice-form-store";

describe("useInvoiceFormStore customer selection", () => {
	beforeEach(() => {
		useInvoiceFormStore.getState().actions.reset();
	});

	it("defaults new mobile invoices to credit card payment method", () => {
		expect(useInvoiceFormStore.getState().meta.paymentMethod).toBe(
			"Credit Card",
		);
	});

	it("seeds the first workflow item after selecting a customer", () => {
		expect(useInvoiceFormStore.getState().lineItems).toHaveLength(0);

		const customer = invoiceCustomers[0];
		if (!customer) throw new Error("Expected an invoice customer fixture.");

		useInvoiceFormStore.getState().actions.selectCustomer(customer);

		const { lineItems } = useInvoiceFormStore.getState();
		expect(lineItems).toHaveLength(1);
		expect(lineItems[0]?.title).toBe("New Line");
		expect(firstStepTitle(lineItems[0])).toBe("Item Type");
	});

	it("preserves the seeded workflow item through an empty create bootstrap", () => {
		const customer = invoiceCustomers[0];
		if (!customer) throw new Error("Expected an invoice customer fixture.");
		const selectedCustomer = customer;

		useInvoiceFormStore.getState().actions.selectCustomer(selectedCustomer);

		const bootstrapRecord = createMockNewSalesFormRecord("order");
		const bootstrap = {
			...bootstrapRecord,
			customer: selectedCustomer,
			form: {
				...bootstrapRecord.form,
				customerId: selectedCustomer.id,
			},
			lineItems: [],
		};

		useInvoiceFormStore.getState().actions.hydrateFromRecord(bootstrap);

		const { lineItems } = useInvoiceFormStore.getState();
		expect(lineItems).toHaveLength(1);
		expect(lineItems[0]?.title).toBe("New Line");
		expect(firstStepTitle(lineItems[0])).toBe("Item Type");
	});

	it("keeps credit card default through create bootstrap save payloads", () => {
		const customer = invoiceCustomers[0];
		if (!customer) throw new Error("Expected an invoice customer fixture.");

		useInvoiceFormStore.getState().actions.selectCustomer(customer);
		const bootstrapRecord = createMockNewSalesFormRecord("order");

		useInvoiceFormStore.getState().actions.hydrateFromRecord({
			...bootstrapRecord,
			customer,
			form: {
				...bootstrapRecord.form,
				customerId: customer.id,
				paymentMethod: null,
			},
			lineItems: [
				{
					uid: "line-1",
					title: "Line",
					description: "Taxable line",
					qty: 1,
					unitPrice: 100,
					lineTotal: 100,
					taxxable: true,
				},
			],
			extraCosts: [],
			summary: {
				...bootstrapRecord.summary,
				taxRate: 0,
			},
		});

		const state = useInvoiceFormStore.getState();
		const payload = state.actions.buildSavePayload(false);

		expect(state.meta.paymentMethod).toBe("Credit Card");
		expect(payload.meta.paymentMethod).toBe("Credit Card");
		expect(payload.summary.ccc).toBe(3.5);
		expect(payload.summary.grandTotal).toBe(103.5);
	});

	it("stores visible save error messages", () => {
		useInvoiceFormStore.getState().actions.markSaving();
		useInvoiceFormStore
			.getState()
			.actions.markError(
				"Could not save invoice. Check your connection and try again.",
			);

		expect(useInvoiceFormStore.getState().saveStatus).toBe("error");
		expect(useInvoiceFormStore.getState().validationError).toBe(
			"Could not save invoice. Check your connection and try again.",
		);
	});
});

function firstStepTitle(
	line:
		| {
				formSteps?: Array<{
					step?: { title?: string | null } | null;
				}> | null;
		  }
		| null
		| undefined,
) {
	return line?.formSteps?.[0]?.step?.title;
}
