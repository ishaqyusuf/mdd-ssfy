import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import { getJobs } from "@/app-deps/(v1)/_actions/hrm-jobs/get-jobs";
import SubmitJobBtn from "@/app-deps/(v2)/(loggedIn)/contractors/_components/submit-job-btn";
import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import PageShell from "@/components/page-shell";
import { redirect } from "next/navigation";
import JobTableShell from "./job-table-shell";
export const metadata: Metadata = {
	title: "Jobs",
};
export default async function ContractorJobsPage(props) {
	redirect("/hrm/contractors/jobs");
	const searchParams = await props.searchParams;
	const response = await getJobs(queryParams(searchParams));

	return (
		<TabbedLayout tabKey="Job">
			<Breadcrumbs>
				<BreadLink isFirst title="Hrm" />
				<BreadLink isLast title="Jobs" />
			</Breadcrumbs>
			<PageHeader title="Jobs" Action={SubmitJobBtn} />
			<PageShell>
				<JobTableShell adminMode searchParams={searchParams} {...response} />
			</PageShell>
		</TabbedLayout>
	);
}
