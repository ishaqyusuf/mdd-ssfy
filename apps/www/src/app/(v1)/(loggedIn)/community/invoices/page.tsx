import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import CommunityInvoiceTableShell from "@/components/_v1/shells/community-invoice-table-shell";
import { getHomeInvoices } from "@/app/(v1)/_actions/community-invoice/get-invoices";
import EditInvoiceModal from "@/components/_v1/modals/edit-invoice-modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "All Unit Invoices",
};
interface Props {}
export default async function InvoicesPage({ searchParams, params }) {
    const response = await getHomeInvoices(queryParams({ ...searchParams }));
    // metadata.title = `${project.title} | Homes`;

    return (
        <AuthGuard can={["viewInvoice"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink link="/community/projects" title="Projects" />
                    <BreadLink
                        link="/community/invoices"
                        title="All Invoices"
                        isLast
                    />
                </Breadcrumbs>
                <PageHeader title={"Unit Invoices"} subtitle={``} />
                <CommunityInvoiceTableShell
                    projectView={false}
                    searchParams={searchParams}
                    data={response.data as any}
                    pageInfo={response.pageInfo}
                />
                <EditInvoiceModal />
            </div>
        </AuthGuard>
    );
}
