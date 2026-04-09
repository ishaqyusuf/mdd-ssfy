"use client";

import PageShell from "@/components/page-shell";

import { SalesInvoiceView } from "@/components/sales-printer";

export default function Page({}) {
	return (
		<PageShell>
			{" "}
			<SalesInvoiceView />
		</PageShell>
	);
}
