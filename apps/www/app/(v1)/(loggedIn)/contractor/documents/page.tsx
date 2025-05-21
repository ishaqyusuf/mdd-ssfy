import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";

import HrmLayout from "@/components/_v1/tab-layouts/hrm-layout";
import EmployeesTableShell from "@/app/(v1)/(loggedIn)/hrm/employees-legacy/employees-table-shell";
import { getEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import EmployeeModal from "@/components/_v1/modals/employee-modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Documents",
};
export default async function DocumentsPage({ searchParams }) {
    const response = await getEmployees(
        queryParams(searchParams, {
            role: "1099 Contractor",
        }),
    );

    return (
        <HrmLayout>
            <AuthGuard can={["editEmployee"]}>
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink isLast title="Employees" />
                </Breadcrumbs>
                <PageHeader title="Employees" newDialog="employee" />
                <EmployeesTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <EmployeeModal />
            </AuthGuard>
        </HrmLayout>
    );
}
