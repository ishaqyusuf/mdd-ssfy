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

export async function getPrintDocumentData(db: Db, input: PrintSalesV2Input) {
	const { pages, title, firstOrderId } = await getPrintData(db, input);

	return {
		pages,
		title: title.replace(/[^\w\-]+/g, "_"),
		firstOrderId,
		companyAddress: resolveSalesCompanyAddress(firstOrderId),
	};
}
