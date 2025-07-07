import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import HrmLayout from "@/components/_v1/tab-layouts/hrm-layout";

import { getProfiles } from "@/app/(v1)/_actions/hrm/employee-profiles";
import EmployeeProfileTableShell from "@/components/_v1/shells/employee-profile-table-shell";
import EmployeeProfileModal from "@/components/_v1/modals/employee-profile-modal";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Employee Profiles",
};
export default async function EmployeeProfilePage({ searchParams }) {
    const response = await getProfiles(queryParams(searchParams));
    return (
        <AuthGuard can={["editEmployee"]}>
            <HrmLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Hrm" />
                    <BreadLink isLast title="Employee Profiles" />
                </Breadcrumbs>
                <PageHeader
                    title="Employee Profiles"
                    newDialog="employeeProfile"
                />
                <EmployeeProfileTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <EmployeeProfileModal />
            </HrmLayout>
        </AuthGuard>
    );
}
