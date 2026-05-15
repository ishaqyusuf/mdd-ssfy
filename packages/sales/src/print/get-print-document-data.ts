import type { Db } from "@gnd/db";
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

function getDealerLogoUrl(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta))
		return undefined;
	const value = (meta as { logoUrl?: unknown }).logoUrl;
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
						},
					},
				},
			},
		},
	});
	const dealer = sale?.dealerAuth;
	if (!dealer) return null;
	const address = dealer.primaryBillingAddress;
	const cityLine = [address?.city, address?.state, address?.country]
		.filter(Boolean)
		.join(", ");

	return {
		logoUrl: getDealerLogoUrl(dealer.meta),
		companyAddress: {
			address1: dealer.companyName || dealer.name || address?.address1 || "",
			address2: [address?.address1, address?.address2, cityLine]
				.filter(Boolean)
				.join(" "),
			phone: dealer.phoneNo || "",
		} satisfies CompanyAddress,
	};
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
