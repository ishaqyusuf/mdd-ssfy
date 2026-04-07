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
		scope: "selection",
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink("p/jobs", { token, preview: true }, true);
}

export async function generatePayrollReport() {
	const token = await generateToken({
		context: "payroll-report",
		scope: "all-unpaid",
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink("p/jobs", { token, preview: true }, true);
}

export async function printContractorPayoutReport({
	paymentIds,
}: {
	paymentIds: number[];
}) {
	if (!paymentIds.length) return;

	const token = await generateToken({
		paymentIds,
		expiry: addDays(new Date(), 7).toISOString(),
	});

	openLink("p/payouts", { token, preview: true }, true);
}
