import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import PageShell from "@/components/page-shell";
import {
	getJobPayments,
	getMyPayments,
} from "@/app-deps/(v1)/_actions/hrm-jobs/get-payments";

import JobPaymentTableShell from "../../contractor/jobs/payments/job-payment-table-shell";

export const metadata: Metadata = {
	title: "My Payments",
};
export default async function MyJobPaymentsPage(props) {
	const searchParams = await props.searchParams;
	const response = await getMyPayments(queryParams(searchParams));
	return (
		<PageShell>
			<div className="space-y-4 flex flex-col">
				<Breadcrumbs>
					<BreadLink isFirst title="Hrm" />
					<BreadLink isLast title="Payments" />
				</Breadcrumbs>
				<PageHeader title="My Payments" />
				<JobPaymentTableShell searchParams={searchParams} {...response} />
			</div>
		</PageShell>
	);
}
