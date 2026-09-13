import { buildInvoicePrintPageFromSalesFormSnapshot } from "@gnd/sales/print/snapshot-sections";
import type { RequestGenerationState } from "./request-generation-transaction";
import type {
	NewSalesFormPrintContext,
	NewSalesFormRecord,
	NewSalesFormResolvedCustomer,
} from "./schema";

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

type ResolvedCustomerPreviewContext = Pick<
	NewSalesFormResolvedCustomer,
	"customer" | "billingAddress" | "shippingAddress"
>;

function toPrintAddress(
	address:
		| ResolvedCustomerPreviewContext["billingAddress"]
		| ResolvedCustomerPreviewContext["shippingAddress"],
) {
	if (!address) return null;
	return {
		...address,
		meta: { zip_code: address.zip_code },
	};
}

export function resolveApprovedSalesRequestInvoicePreviewContext(input: {
	resolvedCustomer: ResolvedCustomerPreviewContext;
	printContext: NewSalesFormPrintContext;
}) {
	return {
		customer: {
			...input.resolvedCustomer.customer,
			phoneNo:
				input.resolvedCustomer.customer.phoneNo ??
				input.resolvedCustomer.customer.phone,
		},
		billingAddress: toPrintAddress(input.resolvedCustomer.billingAddress),
		shippingAddress: toPrintAddress(
			input.resolvedCustomer.shippingAddress ??
				input.resolvedCustomer.billingAddress,
		),
		setting: {
			id: input.printContext.settingId ?? undefined,
			data: input.printContext.settingsMeta,
		} as InvoiceSnapshotInput["setting"],
	};
}

export class SalesRequestInvoicePreviewStaleError extends Error {
	constructor() {
		super("The Sales form changed while invoice preview data was loading");
		this.name = "SalesRequestInvoicePreviewStaleError";
	}
}

export async function openCurrentApprovedSalesRequestInvoicePreview(input: {
	record: NewSalesFormRecord;
	requestGeneration: RequestGenerationState;
	loadResolvedCustomer: () => Promise<ResolvedCustomerPreviewContext>;
	loadPrintContext: () => Promise<NewSalesFormPrintContext>;
	getCurrentRecord: () => NewSalesFormRecord | null;
	validateCurrentRecord: (record: NewSalesFormRecord) => boolean;
	open: (
		page: ReturnType<typeof buildApprovedSalesRequestInvoicePreview>,
	) => void;
}) {
	const [resolvedCustomer, printContext] = await Promise.all([
		input.loadResolvedCustomer(),
		input.loadPrintContext(),
	]);
	const currentRecord = input.getCurrentRecord();
	if (currentRecord !== input.record) {
		throw new SalesRequestInvoicePreviewStaleError();
	}
	if (!input.validateCurrentRecord(currentRecord)) return null;
	return openApprovedSalesRequestInvoicePreview(
		{
			record: currentRecord,
			requestGeneration: input.requestGeneration,
			...resolveApprovedSalesRequestInvoicePreviewContext({
				resolvedCustomer,
				printContext,
			}),
		},
		input.open,
	);
}

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
