import type { SalesSetting } from "../sales-control/settings";
import { buildCustomerNameLines } from "./compose/customer-name-lines";
import { composeDoorSections } from "./compose/door-sections";
import { composeFooter } from "./compose/footer";
import { suppressMetadataBackedGroupSiblings } from "./compose/grouped-item-helpers";
import { composeLineItemSections } from "./compose/line-item-sections";
import { composeMeta } from "./compose/meta";
import { composeMouldingSections } from "./compose/moulding-sections";
import { composeServiceSections } from "./compose/service-sections";
import { composeShelfSections } from "./compose/shelf-sections";
import { getModeConfig } from "./constants";
import { buildPrintItemsFromSalesFormLineItems } from "./persisted-form-fallback";
import type { PrintSalesData } from "./query";
import type { AddressBlock, PrintPage, PrintSection } from "./types";

type InvoicePrintSnapshotInput = {
	lineItems: unknown;
	salesOrderId?: number | null;
	revisionDate?: Date | string | null;
	setting?: SalesSetting | null;
};

type InvoicePrintAddressSnapshotInput = {
	customer: unknown;
	billingAddress: unknown;
	shippingAddress: unknown;
};

type InvoicePrintPageSnapshotInput = InvoicePrintSnapshotInput &
	InvoicePrintAddressSnapshotInput & {
		orderNo: string;
		form: unknown;
		summary: unknown;
		extraCosts: unknown;
		salesperson: unknown;
	};

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildSnapshotAddressLines(
	customerValue: unknown,
	addressValue: unknown,
) {
	const customer = record(customerValue);
	const address = record(addressValue);
	const meta = record(address.meta);
	const phone = text(address.phoneNo) || text(customer.phoneNo);
	const phone2 = text(address.phoneNo2);
	const email = text(address.email) || text(customer.email);
	const street1 = text(address.address1) || text(customer.address);
	const street2 = text(address.address2);
	const cityStateZip = [
		text(address.city),
		text(address.state),
		text(meta.zip_code),
	]
		.filter(Boolean)
		.join(" ");

	return [
		...buildCustomerNameLines({
			businessName: text(customer.businessName),
			customerName: text(customer.name),
			addressName: text(address.name),
			uppercase: true,
		}),
		[phone, phone2 ? `(${phone2})` : ""].filter(Boolean).join(" "),
		email?.toLowerCase(),
		street1,
		street2,
		cityStateZip,
	].filter(Boolean) as string[];
}

/** Matches the sales-preview address-line rules for an immutable approval snapshot. */
export function buildInvoicePrintAddressesFromSnapshot(
	input: InvoicePrintAddressSnapshotInput,
): { billing: AddressBlock; shipping: AddressBlock } {
	return {
		billing: {
			title: "Sold To",
			lines: buildSnapshotAddressLines(input.customer, input.billingAddress),
		},
		shipping: {
			title: "Ship To",
			lines: buildSnapshotAddressLines(input.customer, input.shippingAddress),
		},
	};
}

function number(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function resolveRevisionDate(value: InvoicePrintSnapshotInput["revisionDate"]) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	return new Date(0);
}

/** Composes an immutable Special Order snapshot with the current sales-preview pipeline. */
export function buildInvoicePrintSectionsFromSalesFormSnapshot(
	input: InvoicePrintSnapshotInput,
): PrintSection[] {
	const revisionDate = resolveRevisionDate(input.revisionDate);
	const salesOrderId = input.salesOrderId ?? -1;
	const items = buildPrintItemsFromSalesFormLineItems(input.lineItems, {
		salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
	});
	if (!items) return [];

	const sale = {
		id: salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
		items,
	} as unknown as PrintSalesData;
	const config = getModeConfig("invoice");
	const compositionSale = {
		...sale,
		items: suppressMetadataBackedGroupSiblings(sale.items),
	};

	return [
		...composeDoorSections(compositionSale, config, input.setting ?? null),
		...composeMouldingSections(compositionSale, config),
		...composeServiceSections(compositionSale, config),
		...composeShelfSections(compositionSale, config),
		...composeLineItemSections(compositionSale, config),
	].sort((a, b) => a.index - b.index);
}

/**
 * Produces the complete customer invoice page from the immutable Special Order
 * request snapshot. Its header, item sections, and footer use the same sales
 * HTML template and composers as the authenticated preview.
 */
export function buildInvoicePrintPageFromSalesFormSnapshot(
	input: InvoicePrintPageSnapshotInput,
): PrintPage {
	const revisionDate = resolveRevisionDate(input.revisionDate);
	const salesOrderId = input.salesOrderId ?? -1;
	const form = record(input.form);
	const summary = record(input.summary);
	const customer = record(input.customer);
	const salesperson = record(input.salesperson);
	const lineItems = Array.isArray(input.lineItems) ? input.lineItems : [];
	const extraCosts = Array.isArray(input.extraCosts) ? input.extraCosts : [];
	const items =
		buildPrintItemsFromSalesFormLineItems(lineItems, {
			salesOrderId,
			createdAt: revisionDate,
			updatedAt: revisionDate,
		}) || [];
	const sale = {
		id: salesOrderId,
		orderId: input.orderNo,
		createdAt: revisionDate,
		updatedAt: revisionDate,
		items,
		customer,
		salesRep: salesperson,
		billingAddress: record(input.billingAddress),
		shippingAddress: record(input.shippingAddress),
		meta: {
			po: text(form.po),
			newSalesForm: { form },
		},
		extraCosts,
		subTotal: number(summary.subTotal),
		tax: number(summary.taxTotal),
		taxPercentage: number(summary.taxRate),
		grandTotal: number(summary.grandTotal),
		amountDue: number(summary.amountDue ?? summary.grandTotal),
		payments: [],
		taxes: [],
	} as unknown as PrintSalesData;
	const config = getModeConfig("invoice");
	const compositionSale = {
		...sale,
		items: suppressMetadataBackedGroupSiblings(sale.items),
	};
	const sections: PrintSection[] = [
		...composeDoorSections(compositionSale, config, input.setting ?? null),
		...composeMouldingSections(compositionSale, config),
		...composeServiceSections(compositionSale, config),
		...composeShelfSections(compositionSale, config),
		...composeLineItemSections(compositionSale, config),
	].sort((a, b) => a.index - b.index);
	const { billing, shipping } = buildInvoicePrintAddressesFromSnapshot(input);

	return {
		meta: composeMeta(sale, "invoice"),
		billing,
		shipping,
		sections,
		footer: composeFooter(sale, "invoice"),
		config,
		signing: null,
		specialOrder: null,
	};
}
