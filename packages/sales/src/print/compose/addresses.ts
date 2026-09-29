import type { PrintSalesData } from "../query";
import type { AddressBlock, PrintMode } from "../types";
import { buildCustomerNameLines } from "./customer-name-lines";

function buildAddressLines(
	customer: PrintSalesData["customer"],
	address: PrintSalesData["billingAddress"],
	businessName?: string | null,
): string[] {
	if (!address && !customer) return ["No Address"];

	const meta =
		address?.meta &&
		typeof address.meta === "object" &&
		!Array.isArray(address.meta)
			? (address.meta as Record<string, unknown>)
			: {};
	return [
		...buildCustomerNameLines({
			businessName,
			customerName: customer?.name,
			addressName: address?.name,
			uppercase: true,
		}),
		[
			address?.phoneNo || customer?.phoneNo,
			address?.phoneNo2 ? `(${address.phoneNo2})` : "",
		]
			.filter(Boolean)
			.join(" "),
		(address?.email || customer?.email)?.toLowerCase(),
		address?.address1 || customer?.address,
		address?.address2,
		[address?.city, address?.state, meta?.zip_code].filter(Boolean).join(" "),
	].filter(Boolean) as string[];
}

function buildDealerBillingLines(dealer: NonNullable<PrintSalesData["dealerAuth"]>) {
	const address = dealer.primaryBillingAddress;
	const meta =
		dealer.meta && typeof dealer.meta === "object" && !Array.isArray(dealer.meta)
			? (dealer.meta as Record<string, unknown>)
			: {};
	const invoiceEmail =
		typeof meta.invoiceEmail === "string" && meta.invoiceEmail.trim()
			? meta.invoiceEmail.trim()
			: dealer.email;
	const addressMeta =
		address?.meta && typeof address.meta === "object" && !Array.isArray(address.meta)
			? (address.meta as Record<string, unknown>)
			: {};
	const zipValue = addressMeta.zip_code || meta.billingZip || meta.zip_code;
	const zip = typeof zipValue === "string" ? zipValue : null;
	return [
		(dealer.companyName || dealer.name || "Dealer").toUpperCase(),
		dealer.phoneNo,
		invoiceEmail.toLowerCase(),
		address?.address1,
		address?.address2,
		[address?.city, address?.state, zip]
			.filter(Boolean)
			.join(" "),
		address?.country,
	].filter(Boolean) as string[];
}

export function composeAddresses(
	sale: PrintSalesData,
	mode: PrintMode,
): { billing: AddressBlock | null; shipping: AddressBlock | null } {
	const isQuote = mode === "quote";
	const isDealerCustomerCopy = Boolean(
		(sale as PrintSalesData & { dealerCustomerPayment?: unknown })
			.dealerCustomerPayment,
	);
	const isDealerInternal =
		Boolean(sale.dealerAuthId && sale.dealerAuth) && !isDealerCustomerCopy;

	const billing: AddressBlock = {
		title: isQuote ? "Customer" : "Sold To",
		lines: isDealerInternal && sale.dealerAuth
			? buildDealerBillingLines(sale.dealerAuth)
			: buildAddressLines(
					sale.customer,
					sale.billingAddress,
					sale.customer?.businessName,
				),
	};

	const shipping: AddressBlock = {
		title: isQuote ? "Shipping Address" : "Ship To",
		lines: buildAddressLines(
			sale.customer,
			sale.shippingAddress,
			sale.customer?.businessName,
		),
	};

	return { billing, shipping };
}
