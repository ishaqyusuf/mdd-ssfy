import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { _getCommunityJobTasks } from "@/app/(v1)/_actions/community-job/_assign-jobs";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import AssignTaskModal from "@/components/_v1/modals/assign-task-modal";
import VerifyTaskJobsBeforeAssign from "@/components/_v1/modals/community/verify-task-jobs-before-assign-modal";
import PageHeader from "@/components/_v1/page-header";
import CommunityTaskTableShell from "@/components/_v1/shells/community-tasks-table-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Assign Tasks",
};

export default async function AssignTasksPage({ searchParams }) {
    const response = await _getCommunityJobTasks(
        queryParams({
            ...searchParams,
        })
    );

    return (
        <AuthGuard can={["viewAssignTasks"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Contractor" />
                    {/* <BreadLink link="/contractor/" title="Projects" /> */}
                    <BreadLink title="Assign Tasks" isLast />
                </Breadcrumbs>
                <PageHeader title={"Assign Task"} subtitle={``} />
                <CommunityTaskTableShell
                    searchParams={searchParams}
                    data={response.data as any}
                    pageInfo={response.pageInfo}
                />
                <AssignTaskModal />
                <VerifyTaskJobsBeforeAssign />
            </div>
        </AuthGuard>
    );
}
