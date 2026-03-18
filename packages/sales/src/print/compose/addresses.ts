import type { AddressBlock, PrintMode } from "../types";
import type { PrintSalesData } from "../query";

function buildAddressLines(
  customer: PrintSalesData["customer"],
  address: PrintSalesData["billingAddress"],
  businessName?: string | null,
): string[] {
  if (!address && !customer) return ["No Address"];

  const meta = address?.meta as any;
  return [
    (businessName || address?.name || customer?.name)?.toUpperCase(),
    [
      address?.phoneNo || customer?.phoneNo,
      address?.phoneNo2 ? `(${address.phoneNo2})` : "",
    ]
      .filter(Boolean)
      .join(" "),
    (address?.email || customer?.email)?.toLowerCase(),
    address?.address1 || address?.address2 || customer?.address,
    [address?.city, address?.state, meta?.zip_code]
      .filter(Boolean)
      .join(" "),
  ].filter(Boolean) as string[];
}

export function composeAddresses(
  sale: PrintSalesData,
  mode: PrintMode,
): { billing: AddressBlock | null; shipping: AddressBlock | null } {
  const isQuote = mode === "quote";

  const billing: AddressBlock = {
    title: isQuote ? "Customer" : "Sold To",
    lines: buildAddressLines(
      sale.customer,
      sale.billingAddress,
      sale.customer?.businessName,
    ),
  };

  const shipping: AddressBlock = {
    title: isQuote ? "Shipping Address" : "Ship To",
    lines: buildAddressLines(sale.customer, sale.shippingAddress),
  };

  return { billing, shipping };
}
