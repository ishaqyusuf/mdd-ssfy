"use client";

import { generateToken } from "@/actions/token-action";
import { addDays } from "date-fns";

function getFilenameFromContentDisposition(value: string | null) {
	const match = value?.match(/filename="?(?<filename>[^";]+)"?/i);
	return match?.groups?.filename || "Customer_Statement.pdf";
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.rel = "noopener";
	link.style.display = "none";
	document.body.appendChild(link);
	link.click();

	setTimeout(() => {
		link.remove();
		URL.revokeObjectURL(url);
	}, 1_000);
}

export async function downloadCustomerStatementPdf(input: {
	customerId: number;
	salesIds: number[];
	includeSalesInvoicesInPdf?: boolean;
	templateId?: string;
}) {
	if (!input.customerId || !input.salesIds.length) return;

	const token = await generateToken({
		customerId: input.customerId,
		salesIds: input.salesIds,
		includeSalesInvoicesInPdf: input.includeSalesInvoicesInPdf ?? false,
		templateId: input.templateId || "template-1",
		expiry: addDays(new Date(), 7).toISOString(),
	});
	const params = new URLSearchParams({
		token,
		templateId: input.templateId || "template-1",
	});
	const response = await fetch(
		`/api/download/customer-statement?${params.toString()}`,
	);

	if (!response.ok) {
		const error = await response.json().catch(() => null);
		throw new Error(error?.error || "Unable to prepare statement PDF.");
	}

	const blob = await response.blob();
	downloadBlob(
		blob,
		getFilenameFromContentDisposition(response.headers.get("Content-Disposition")),
	);
}
