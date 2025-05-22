import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import HrmLayout from "@/components/_v1/tab-layouts/hrm-layout";

import { getProfiles } from "@/app/(v1)/_actions/hrm/employee-profiles";
import EmployeeProfileTableShell from "@/components/_v1/shells/employee-profile-table-shell";
import EmployeeProfileModal from "@/components/_v1/modals/employee-profile-modal";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { _getRoles } from "@/app/(v1)/_actions/hrm/roles.crud";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import RolesTableShell from "./roles-table-shell";

export const metadata: Metadata = {
    title: "Roles",
};
export default async function EmployeeRolesPage(props) {
    const searchParams = await props.searchParams;
    const response = await _getRoles(queryParams(searchParams));
    return (
        <AuthGuard can={["viewRole"]}>
            <HrmLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Hrm" />
                    <BreadLink isLast title="Roles" />
                </Breadcrumbs>
                <RolesTableShell searchParams={searchParams} {...response} />
            </HrmLayout>
        </AuthGuard>
    );
}
