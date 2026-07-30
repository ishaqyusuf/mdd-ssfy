import {
	DEFAULT_SALES_REPORT_LAYOUT,
	SALES_REPORT_LAYOUT_COOKIE,
	type SalesReportLayout,
	normalizeSalesReportLayout,
} from "@/lib/sales-report-layout";
import { cookies } from "next/headers";

export async function getInitialSalesReportLayout(): Promise<SalesReportLayout> {
	const raw = (await cookies()).get(SALES_REPORT_LAYOUT_COOKIE)?.value;
	if (!raw) return DEFAULT_SALES_REPORT_LAYOUT;

	try {
		return normalizeSalesReportLayout(JSON.parse(raw));
	} catch {
		return DEFAULT_SALES_REPORT_LAYOUT;
	}
}
