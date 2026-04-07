"use client";

import { generateToken } from "@/actions/token-action";
import { addDays } from "date-fns";
import { openLink } from "./open-link";

export async function printCommunityInvoiceAgingReport(filters: {
	builderSlug?: string | null;
	projectSlug?: string | null;
	production?: string | null;
	invoice?: string | null;
	installation?: string | null;
	dateRange?: (string | null | undefined)[] | null;
}) {
	const token = await generateToken({
		...filters,
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink("p/community-invoice/ageing-report", { token, preview: true }, true);
}
