import { buildInvoicePrintPageFromSalesFormSnapshot } from "@gnd/sales/print";
import type { RequestGenerationState } from "./request-generation-transaction";
import type { NewSalesFormRecord } from "./schema";

type InvoiceSnapshotInput = Parameters<
	typeof buildInvoicePrintPageFromSalesFormSnapshot
>[0];

export type ApprovedSalesRequestInvoicePreviewInput = {
	record: NewSalesFormRecord;
	requestGeneration: Pick<RequestGenerationState, "manualSaveRequired">;
	customer?: unknown;
	billingAddress?: unknown;
	shippingAddress?: unknown;
	salesperson?: unknown;
	setting?: InvoiceSnapshotInput["setting"];
};

/**
 * Composes a review-only invoice from the same native record shown by the New
 * Sales Form. This is intentionally in-memory: it never autosaves, creates a
 * Sales row, publishes a document snapshot, or dispatches an outbound command.
 */
export function buildApprovedSalesRequestInvoicePreview(
	input: ApprovedSalesRequestInvoicePreviewInput,
) {
	if (input.record.salesId != null || input.record.slug != null) {
		throw new Error("Generated invoice preview requires an unsaved sales form");
	}
	if (!input.requestGeneration.manualSaveRequired) {
		throw new Error(
			"Generated invoice preview requires a human-applied proposal",
		);
	}

	return buildInvoicePrintPageFromSalesFormSnapshot({
		orderNo: input.record.type === "quote" ? "DRAFT QUOTE" : "DRAFT ORDER",
		salesOrderId: null,
		revisionDate:
			input.record.updatedAt || input.record.form.createdAt || new Date(0),
		form: input.record.form,
		lineItems: input.record.lineItems,
		extraCosts: input.record.extraCosts,
		summary: input.record.summary,
		customer: input.customer ?? input.record.customer,
		billingAddress: input.billingAddress ?? null,
		shippingAddress: input.shippingAddress ?? null,
		salesperson: input.salesperson ?? null,
		setting: input.setting ?? null,
	});
}

export function openApprovedSalesRequestInvoicePreview(
	input: ApprovedSalesRequestInvoicePreviewInput,
	open: (
		page: ReturnType<typeof buildApprovedSalesRequestInvoicePreview>,
	) => void,
) {
	const page = buildApprovedSalesRequestInvoicePreview(input);
	open(page);
	return page;
}
