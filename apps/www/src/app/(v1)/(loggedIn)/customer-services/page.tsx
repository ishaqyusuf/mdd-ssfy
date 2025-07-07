import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";
import { IProject } from "@/types/community";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { getCustomerServices } from "@/app/(v1)/_actions/customer-services/customer-services";
import CustomerServiceTableShell from "@/components/_v1/shells/customer-service-table-shell";
import CustomerServiceModal from "@/components/_v1/modals/customer-service-modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Customer Services",
};
interface Props {}
export default async function OrdersPage({ searchParams }) {
    const response = await getCustomerServices(queryParams(searchParams));

    return (
        <AuthGuard can={["viewCustomerService"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Customer Services" />
                </Breadcrumbs>
                <PageHeader
                    title="Customer Services"
                    newDialog="customerServices"
                />
                <CustomerServiceTableShell<IProject>
                    searchParams={searchParams}
                    {...response}
                />
                <CustomerServiceModal />
            </div>
        </AuthGuard>
    );
}
