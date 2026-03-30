import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import { getMyJobs } from "@/app-deps/(v1)/_actions/hrm-jobs/get-jobs";

import SubmitJobBtn from "@/app-deps/(v2)/(loggedIn)/contractors/_components/submit-job-btn";
import TaskAction from "@/components/_v1/tasks/task-action";
import JobTableShell from "../../contractor/jobs/job-table-shell";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Installations",
};
export default async function PunchoutPage(props) {
	const searchParams = await props.searchParams;
	const response = await getMyJobs(
		queryParams(searchParams, { type: "punchout" }),
	);
	return (
		<PageShell>
			<div className="space-y-4 flex flex-col">
				<Breadcrumbs>
					<BreadLink isLast title="Jobs" />
				</Breadcrumbs>
				<PageHeader title="Jobs" Action={SubmitJobBtn} />
				<JobTableShell searchParams={searchParams} {...response} />
			</div>
		</PageShell>
	);
}
