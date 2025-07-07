import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";

import { getEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import EmployeeModal from "@/components/_v1/modals/employee-modal";
import ContractorsTableShell from "@/components/_v1/shells/contractors-table-shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Documents",
};
export default async function ContractorsPage({ searchParams }) {
    const response = await getEmployees(
        queryParams(searchParams, {
            role: "1099 Contractor",
        })
    );

    return (
        <AuthGuard can={["editEmployee"]}>
            <div className="sm:px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Contactors" />
                    {/* <BreadLink isLast title="Employees" /> */}
                </Breadcrumbs>
                <PageHeader title="Contractors" newDialog="employee" />
                <ContractorsTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <EmployeeModal />
            </div>
        </AuthGuard>
    );
}
