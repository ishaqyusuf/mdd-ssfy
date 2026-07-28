"use client";

import { generateToken } from "@/actions/token-action";
import { addDays } from "date-fns";
import { openLink } from "./open-link";

type UnitInvoiceReportFilters = {
	q?: string | null;
	builderSlug?: string | null;
	projectSlug?: string | null;
	production?: string | null;
	invoice?: string | null;
	installation?: string | null;
	dateRange?: (string | null | undefined)[] | null;
};

async function printCommunityInvoiceReport(
	path: string,
	filters: UnitInvoiceReportFilters,
) {
	const token = await generateToken({
		...filters,
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink(path, { token, preview: true }, true);
}

export async function printCommunityInvoiceAgingReport(
	filters: UnitInvoiceReportFilters,
) {
	await printCommunityInvoiceReport(
		"p/community-invoice/ageing-report",
		filters,
	);
}

export async function printCommunityInvoiceTaskDetailReport(
	filters: UnitInvoiceReportFilters,
) {
	await printCommunityInvoiceReport(
		"p/community-invoice/task-detail-report",
		filters,
	);
}
