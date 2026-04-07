"use client";

import { generateToken } from "@/actions/token-action";
import { addDays } from "date-fns";
import { openLink } from "./open-link";

export async function printSelectedJobs({
	jobIds,
	context = "jobs-page",
}: {
	jobIds: number[];
	context?: "jobs-page" | "payment-portal" | "payroll-report";
}) {
	if (!jobIds.length) return;

	const token = await generateToken({
		jobIds,
		context,
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink("p/jobs", { token, preview: true }, true);
}

export async function generatePayrollReport(jobIds: number[]) {
	return printSelectedJobs({
		jobIds,
		context: "payroll-report",
	});
}
