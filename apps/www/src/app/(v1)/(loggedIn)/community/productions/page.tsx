import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import CommunityProductionsTableShell from "@/components/_v1/shells/community-productions-table-shell";
import { getProductions } from "@/app/(v1)/_actions/community-production/get-productions";
import { _taskNames } from "@/app/(v1)/_actions/community/_task-names";
import { prisma } from "@/db";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Unit Productions",
};
interface Props {}
export default async function CommunityProductionsPage({
    searchParams,
    params,
}) {
    const taskNames = await _taskNames({
        produceable: true,
    } as any);
    // console.log(taskNames);
    const response = await getProductions(
        queryParams({ _task: taskNames, ...searchParams })
    );
    // metadata.title = `${project.title} | Homes`;

    return (
        <AuthGuard can={["viewProduction"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink link="/community/projects" title="Projects" />
                    <BreadLink title="Productions" isLast />
                </Breadcrumbs>
                <PageHeader title={"Unit Productions"} subtitle={``} />
                <CommunityProductionsTableShell
                    searchParams={searchParams}
                    data={response.data as any}
                    pageInfo={response.pageInfo}
                />
            </div>
        </AuthGuard>
    );
}
