import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";
import { ExtendedHome, IProject } from "@/types/community";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { getHomesAction } from "@/app/(v1)/_actions/community/home";
import ActivateProductionModal from "@/components/_v1/modals/activate-production-modal";
import { _addLotBlocks } from "@/app/(v1)/_actions/community/units/_add-lotblocks";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import HomesTableShell from "./homes-table-shell";
import AddBtn from "./add-button";

export const metadata: Metadata = {
    title: "All Units",
};
interface Props {}
export default async function CommunityUnitsPage({ searchParams, params }) {
    const response = await getHomesAction(
        queryParams({ ...searchParams, _projectSlug: params.slug })
    );
    await _addLotBlocks();
    // console.log(response.data[0]?.search);
    // metadata.title = `${project.title} | Homes`;

    return (
        <AuthGuard can={["viewProject"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink link="/community/projects" title="Projects" />
                    <BreadLink
                        link="/community/units"
                        title="All Units"
                        isLast
                    />
                </Breadcrumbs>
                <PageHeader title={"Units"} subtitle={``} Action={AddBtn} />
                <HomesTableShell<ExtendedHome>
                    projectView={false}
                    data={response.data as any}
                    searchParams={searchParams}
                    pageInfo={response.pageInfo}
                />
                <ActivateProductionModal />
            </div>
        </AuthGuard>
    );
}
