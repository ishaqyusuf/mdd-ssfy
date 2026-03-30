import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import type { Metadata } from "next";

import { queryParams } from "@/app-deps/(v1)/_actions/action-utils";

import { getMyInsuranceStatus } from "@/app-deps/(v1)/_actions/hrm-jobs/get-insurance-status";
import { getMyJobs } from "@/app-deps/(v1)/_actions/hrm-jobs/get-jobs";

import SubmitJobBtn from "@/app-deps/(v2)/(loggedIn)/contractors/_components/submit-job-btn";

import JobTableShell from "@/app-deps/(v1)/(loggedIn)/contractor/jobs/job-table-shell";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Installations",
};
export default async function TaskInstallationPage(props) {
	const searchParams = await props.searchParams;
	const [response, insuranceStatus] = await Promise.all([
		getMyJobs(queryParams(searchParams)),
		getMyInsuranceStatus(),
	]);
	return (
		<PageShell>
			<div className="space-y-4 flex flex-col">
				<Breadcrumbs>
					<BreadLink isLast title="Jobs" />
				</Breadcrumbs>
				<PageHeader
					title="Jobs"
					action={
						<SubmitJobBtn
							disabled={insuranceStatus.blocking}
							disabledReason={insuranceStatus.message}
						/>
					}
				/>
				<JobTableShell searchParams={searchParams} {...response} />
			</div>
		</PageShell>
	);
}
