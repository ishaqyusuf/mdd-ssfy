import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";

import { getJobs } from "@/app/(v1)/_actions/hrm-jobs/get-jobs";
import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import SubmitJobBtn from "@/app/(v2)/(loggedIn)/contractors/_components/submit-job-btn";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import JobTableShell from "./job-table-shell";

export const metadata: Metadata = {
    title: "Jobs",
};
export default async function ContractorJobsPage({ searchParams }) {
    const response = await getJobs(queryParams(searchParams));

    return (
        <TabbedLayout tabKey="Job">
            <Breadcrumbs>
                <BreadLink isFirst title="Hrm" />
                <BreadLink isLast title="Jobs" />
            </Breadcrumbs>
            <PageHeader title="Jobs" Action={SubmitJobBtn} />
            <AuthGuard can={["viewJobPayment"]}>
                <JobTableShell
                    adminMode
                    searchParams={searchParams}
                    {...response}
                />
            </AuthGuard>
        </TabbedLayout>
    );
}
