import type { Db } from "@gnd/db";
import { resolveDealerPrintBrandingFromSource } from "./dealer-branding";
import { getPrintData } from "./get-print-data";
import type { PrintSalesV2Input } from "./schema";
import type { CompanyAddress } from "./types";

const MIAMI_ADDRESS: CompanyAddress = {
	address1: "13285 SW 131 ST",
	address2: "Miami, Fl 33186",
	phone: "305-278-6555",
	fax: "305-278-2003",
};

const LAKE_WALES_ADDRESS: CompanyAddress = {
	address1: "1750 Longleaf Blvd, Suite11",
	address2: "Lake Wales FL 33859",
	phone: "863-275-1011",
};

export function resolveSalesCompanyAddress(
	firstOrderId?: string | null,
): CompanyAddress {
	const orderId = firstOrderId?.toLowerCase() ?? "";
	return ["lrg", "vc"].some((suffix) => orderId.endsWith(suffix))
		? LAKE_WALES_ADDRESS
		: MIAMI_ADDRESS;
}

async function resolveDealerPrintBranding(db: Db, salesOrderId: number) {
	const sale = await db.salesOrders.findUnique({
		where: {
			id: salesOrderId,
		},
		select: {
			dealerAuth: {
				select: {
					companyName: true,
					name: true,
					phoneNo: true,
					meta: true,
					primaryBillingAddress: {
						select: {
							address1: true,
							address2: true,
							city: true,
							state: true,
							country: true,
							meta: true,
						},
					},
				},
			},
		},
	});
	const dealer = sale?.dealerAuth;
	return resolveDealerPrintBrandingFromSource(dealer);
}

export async function getPrintDocumentData(db: Db, input: PrintSalesV2Input) {
	const { pages, title, firstOrderId } = await getPrintData(db, input);
	const dealerBranding = input.ids[0]
		? await resolveDealerPrintBranding(db, input.ids[0])
		: null;

	return {
		pages,
		title: title.replace(/[^\w\-]+/g, "_"),
		firstOrderId,
		companyAddress:
			dealerBranding?.companyAddress ||
			resolveSalesCompanyAddress(firstOrderId),
		logoUrl: dealerBranding?.logoUrl,
	};
}
