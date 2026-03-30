import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import { getJobPayments } from "@/app-deps/(v1)/_actions/hrm-jobs/get-payments";

import PaymentOverviewSheet from "@/components/_v1/sheets/payment-overview-sheet";
import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import JobPaymentTableShell from "./job-payment-table-shell";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Payment Receipts",
};
export default async function JobPaymentsPage(props) {
	const searchParams = await props.searchParams;
	const response = await getJobPayments(queryParams(searchParams));
	return (
		<TabbedLayout tabKey="Job">
			<Breadcrumbs>
				<BreadLink isFirst title="Hrm" />
				<BreadLink isLast title="Payments" />
			</Breadcrumbs>
			<PageHeader
				title="Payment Receipts"
				newLink={"/contractor/jobs/payments/pay"}
				buttonText={"Make Payment"}
				ButtonIcon={"dollar"}
			/>
			<PageShell>
				<JobPaymentTableShell admin searchParams={searchParams} {...response} />
			</PageShell>
			<PaymentOverviewSheet />
		</TabbedLayout>
	);
}
