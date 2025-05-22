import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import CustomersLayout from "@/components/_v1/tab-layouts/customers-layout";

import CustomerProfileTableShell from "@/app/(v1)/(loggedIn)/sales/(customers)/customers/profiles/_components/customer-profile-table-shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import PageAction from "./_components/page-actions";
import { getCustomerProfiles } from "./_components/actions";

export const metadata: Metadata = {
    title: "customer profiles",
};
export default async function CustomerProfilesPage(props) {
    const searchParams = await props.searchParams;
    const response = getCustomerProfiles(searchParams);
    return (
        <AuthGuard can={["editSalesCustomers"]}>
            <CustomersLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Customers" link={"/customers"} />
                    <BreadLink isLast title="Customer Profiles" />
                </Breadcrumbs>
                <PageHeader
                    title="Customer Profiles"
                    // newDialog="customerProfile"
                    Action={PageAction}
                />
                <CustomerProfileTableShell
                    searchParams={searchParams}
                    promise={response}
                />
            </CustomersLayout>
        </AuthGuard>
    );
}
