"use server";

import {
	SALES_REPORT_LAYOUT_COOKIE,
	type SalesReportLayout,
	normalizeSalesReportLayout,
} from "@/lib/sales-report-layout";
import { addYears } from "date-fns";
import { cookies } from "next/headers";

export async function updateSalesReportLayout(layout: SalesReportLayout) {
	const normalized = normalizeSalesReportLayout(layout);
	(await cookies()).set(
		SALES_REPORT_LAYOUT_COOKIE,
		JSON.stringify(normalized),
		{
			expires: addYears(new Date(), 5),
			httpOnly: true,
			path: "/",
			sameSite: "lax",
		},
	);

	return normalized;
}
